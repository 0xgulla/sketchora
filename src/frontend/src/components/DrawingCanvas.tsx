import type React from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { DrawingTool } from "./LeftToolbar";

export type BrushShape =
  | "circle"
  | "square"
  | "rectangle"
  | "triangle"
  | "diamond"
  | "star"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "cross"
  | "arrow"
  | "heart";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  isEraser: boolean;
  shape: BrushShape;
  opacity: number;
  eraserSoftness?: "hard" | "soft";
  hardness?: number;
  vectorShape?: {
    type: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  fillData?: ImageData; // For fill tool: stores flood-fill pixel result
}

export interface LayerData {
  id: number;
  strokes: Stroke[];
  visible: boolean;
  opacity: number;
}

export interface DrawingCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  clearCanvas: () => void;
  undoStroke: () => void;
  getImageData: (
    x: number,
    y: number,
    w: number,
    h: number,
  ) => ImageData | null;
  putImageData: (data: ImageData, x: number, y: number) => void;
  clearRegion: (x: number, y: number, w: number, h: number) => void;
  moveStrokesInRegion: (
    origRect: { x: number; y: number; w: number; h: number },
    dx: number,
    dy: number,
  ) => void;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  snapshotCanvas: () => ImageData | null;
  bakeToFlatLayer?: () => void;
  getCompositeThumbnail?: () => string | null;
  drawText?: (
    x: number,
    y: number,
    text: string,
    fontFamily: string,
    fontSize: number,
    fontWeight: string,
    fontStyle: string,
    color: string,
    textAlign: CanvasTextAlign,
    underline: boolean,
  ) => void;
  /** Return the offscreen canvas for a specific layer by its numeric ID. */
  getLayerCanvas: (layerId: number) => HTMLCanvasElement | null;
  /** Snapshot the offscreen canvas for a layer as physical-pixel ImageData. */
  getLayerImageData: (layerId: number) => ImageData | null;
  /** Restore physical-pixel ImageData to a layer's offscreen canvas and re-composite. */
  putLayerImageData: (layerId: number, data: ImageData) => void;
  /**
   * Return a deep clone of the stroke array for a specific layer.
   * The Transform Tool reads this to work on vector coordinates directly.
   */
  getLayerStrokes: (layerId: number) => Stroke[];
  /**
   * Replace the stroke array for a specific layer and trigger a full redraw.
   * The Transform Tool writes back the mutated strokes after a vector transform.
   */
  setLayerStrokes: (layerId: number, strokes: Stroke[]) => void;
  /**
   * Compute the tight bounding box (in logical CSS px) around the specified
   * strokes of a layer. Pass `strokeIndices` to restrict to a subset; omit to
   * include all strokes. Returns null when there are no strokes to measure.
   *
   * Handles both regular point-array strokes and vectorShape strokes.
   */
  getStrokesBoundingBox: (
    layerId: number,
    strokeIndices?: number[],
  ) => { x: number; y: number; width: number; height: number } | null;
  /**
   * Return the indices of all strokes in a layer whose bounding box intersects
   * the given rectangle (logical CSS px). Used for marquee / region selection.
   */
  getStrokesInRect: (
    layerId: number,
    rect: { x: number; y: number; width: number; height: number },
  ) => number[];
  /**
   * Force a full re-render of the specified layer from its current strokes
   * array (clears the layer canvas and replays all drawStroke calls), then
   * re-composites all layers onto the main display canvas.
   */
  redrawLayerFromStrokes: (layerId: number) => void;
}

export interface LayerFilterData {
  blur: number;
  brightness: number;
  contrast: number;
  opacity: number;
}

interface DrawingCanvasProps {
  brushColor: string;
  brushSize: number;
  activeTool: DrawingTool;
  brushShape: BrushShape;
  brushOpacity: number;
  layers: LayerData[];
  activeLayerId: number;
  onLayersChange: (layers: LayerData[]) => void;
  canvasBg: string;
  pageSize: { width: number; height: number };
  layerFilters?: Record<number, LayerFilterData>;
  onLayerThumbnailUpdate?: (thumbnails: Record<number, string>) => void;
  onColorPick?: (color: string) => void;
  onEyedropperMove?: (color: string | null, x: number, y: number) => void;
  eraserSoftness?: "hard" | "soft";
  brushHardness?: number;
  onCursorMove?: (x: number, y: number) => void;
  onCursorLeave?: () => void;
  fillTolerance?: number;
  selectionRect?: { x: number; y: number; w: number; h: number } | null;
  zoom?: number;
  activeLayerLocked?: boolean;
  shapeToolType?: string | null;
  onTextClick?: (
    canvasX: number,
    canvasY: number,
    screenX: number,
    screenY: number,
  ) => void;
  onStrokeEnd?: (preStrokeSnapshot: LayerData[]) => void;
}

export type VectorShapeType =
  | "rect"
  | "circle"
  | "line"
  | "triangle"
  | "arrow"
  | "star"
  | "polygon";

// ---------- flood fill helpers ----------
function hexToRgba(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
    255,
  ];
}

function colorSimilar(
  r1: number,
  g1: number,
  b1: number,
  a1: number,
  r2: number,
  g2: number,
  b2: number,
  a2: number,
  tol = 32,
): boolean {
  return (
    Math.abs(r1 - r2) +
      Math.abs(g1 - g2) +
      Math.abs(b1 - b2) +
      Math.abs(a1 - a2) <=
    tol * 4
  );
}

/**
 * Proper flood fill - stack-based BFS, no recursion.
 * Works in physical canvas pixel space (accounts for devicePixelRatio).
 * Returns the modified ImageData (already applied to canvas).
 */
function floodFill(
  canvas: HTMLCanvasElement,
  cx: number,
  cy: number,
  fillHex: string,
  tolerance = 32,
  selectionRect?: { x: number; y: number; w: number; h: number } | null,
): ImageData | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;
  // cx/cy are in logical CSS canvas space → convert to physical pixel coords
  const px = Math.round(cx * dpr);
  const py = Math.round(cy * dpr);
  const w = canvas.width; // physical pixels
  const h = canvas.height; // physical pixels

  if (px < 0 || px >= w || py < 0 || py >= h) return null;

  // Selection bounds in physical pixel space
  let minX = 0;
  let minY = 0;
  let maxX = w - 1;
  let maxY = h - 1;
  if (selectionRect && selectionRect.w > 2 && selectionRect.h > 2) {
    minX = Math.max(0, Math.round(selectionRect.x * dpr));
    minY = Math.max(0, Math.round(selectionRect.y * dpr));
    maxX = Math.min(
      w - 1,
      Math.round((selectionRect.x + selectionRect.w) * dpr) - 1,
    );
    maxY = Math.min(
      h - 1,
      Math.round((selectionRect.y + selectionRect.h) * dpr) - 1,
    );
    if (px < minX || px > maxX || py < minY || py > maxY) return null;
  }

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Target color (color of the clicked pixel)
  const targetIdx = (py * w + px) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  const [fr, fg, fb, fa] = hexToRgba(fillHex);

  // If target color is already the fill color (within tolerance), skip
  if (colorSimilar(tr, tg, tb, ta, fr, fg, fb, fa, tolerance)) return null;

  const visited = new Uint8Array(w * h);
  const stack: number[] = [py * w + px];

  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const x = idx % w;
    const y = Math.floor(idx / w);

    // Respect bounds
    if (x < minX || x > maxX || y < minY || y > maxY) continue;

    const di = idx * 4;
    // Check if this pixel matches the target color
    if (
      !colorSimilar(
        data[di],
        data[di + 1],
        data[di + 2],
        data[di + 3],
        tr,
        tg,
        tb,
        ta,
        tolerance,
      )
    )
      continue;

    // Paint the pixel
    data[di] = fr;
    data[di + 1] = fg;
    data[di + 2] = fb;
    data[di + 3] = fa;

    // Push neighbors
    if (x > minX) stack.push(idx - 1);
    if (x < maxX) stack.push(idx + 1);
    if (y > minY) stack.push(idx - w);
    if (y < maxY) stack.push(idx + w);
  }

  ctx.putImageData(imageData, 0, 0);
  return imageData;
}
// ----------------------------------------

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sides: number,
  rotation = 0,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + rotation;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function _drawShape(
  ctx: CanvasRenderingContext2D,
  shape: BrushShape,
  x: number,
  y: number,
  size: number,
  color: string,
  opacity: number,
) {
  const savedAlpha = ctx.globalAlpha;
  ctx.globalAlpha = opacity / 100;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.beginPath();
  const r = size / 2;
  switch (shape) {
    case "circle":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "square":
      ctx.rect(x - r, y - r, size, size);
      ctx.fill();
      break;
    case "rectangle": {
      const hw = r;
      const hh = r * 0.5;
      ctx.rect(x - hw, y - hh, hw * 2, hh * 2);
      ctx.fill();
      break;
    }
    case "triangle": {
      const h = size;
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + h / 2, y + h / 2);
      ctx.lineTo(x - h / 2, y + h / 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "diamond": {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "star": {
      const outerR = r;
      const innerR = r * 0.45;
      const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const rad = i % 2 === 0 ? outerR : innerR;
        const px = x + Math.cos(angle) * rad;
        const py = y + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "pentagon":
      drawPolygon(ctx, x, y, r, 5, -Math.PI / 2);
      ctx.fill();
      break;
    case "hexagon":
      drawPolygon(ctx, x, y, r, 6, 0);
      ctx.fill();
      break;
    case "octagon":
      drawPolygon(ctx, x, y, r, 8, Math.PI / 8);
      ctx.fill();
      break;
    case "cross": {
      const t = r * 0.35;
      ctx.moveTo(x - t, y - r);
      ctx.lineTo(x + t, y - r);
      ctx.lineTo(x + t, y - t);
      ctx.lineTo(x + r, y - t);
      ctx.lineTo(x + r, y + t);
      ctx.lineTo(x + t, y + t);
      ctx.lineTo(x + t, y + r);
      ctx.lineTo(x - t, y + r);
      ctx.lineTo(x - t, y + t);
      ctx.lineTo(x - r, y + t);
      ctx.lineTo(x - r, y - t);
      ctx.lineTo(x - t, y - t);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "arrow": {
      const ah = r;
      const aw = r;
      const neckH = ah * 0.45;
      ctx.moveTo(x + aw, y);
      ctx.lineTo(x, y - ah);
      ctx.lineTo(x, y - neckH);
      ctx.lineTo(x - aw, y - neckH);
      ctx.lineTo(x - aw, y + neckH);
      ctx.lineTo(x, y + neckH);
      ctx.lineTo(x, y + ah);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "heart": {
      const s = r * 0.9;
      ctx.moveTo(x, y + s * 0.9);
      ctx.bezierCurveTo(x - s * 1.5, y, x - s * 2, y - s, x, y - s * 0.5);
      ctx.bezierCurveTo(x + s * 2, y - s, x + s * 1.5, y, x, y + s * 0.9);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.globalAlpha = savedAlpha;
}

function drawEraserStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const { size, points, eraserSoftness } = stroke;
  if (points.length === 0) return;

  const savedOp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "destination-out";

  if (eraserSoftness === "soft") {
    for (const pt of points) {
      const grad = ctx.createRadialGradient(
        pt.x,
        pt.y,
        0,
        pt.x,
        pt.y,
        size / 2,
      );
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  } else {
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      const last = points[points.length - 1];
      const secondLast = points[points.length - 2];
      ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
      ctx.stroke();
    }
  }

  ctx.globalCompositeOperation = savedOp;
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasBg: string,
) {
  // Handle fill strokes - restore their pixel data
  if (stroke.fillData) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(stroke.fillData, 0, 0);
    ctx.restore();
    return;
  }

  if (stroke.vectorShape) {
    const saved = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "source-over";
    renderVectorShape(
      ctx,
      stroke.vectorShape.type,
      stroke.vectorShape.x1,
      stroke.vectorShape.y1,
      stroke.vectorShape.x2,
      stroke.vectorShape.y2,
      stroke.color,
      stroke.opacity,
    );
    ctx.globalCompositeOperation = saved;
    return;
  }
  if (stroke.isEraser) {
    drawEraserStroke(ctx, stroke);
    return;
  }

  const { color, shape, size, points, opacity, hardness = 100 } = stroke;

  if (points.length === 0) return;

  // Soft brush: stamp radial gradients along path
  if (shape === "circle" && hardness < 95) {
    const r = size / 2;
    const opacity01 = opacity / 100;
    const hardR = r * (hardness / 100);
    const softR = r;
    const tmp = document.createElement("canvas");
    tmp.width = 1;
    tmp.height = 1;
    const tmpCtx = tmp.getContext("2d")!;
    tmpCtx.fillStyle = color;
    tmpCtx.fillRect(0, 0, 1, 1);
    const [cr, cg, cb] = Array.from(tmpCtx.getImageData(0, 0, 1, 1).data);
    const spacing = Math.max(1, r * 0.4);
    const allPts: { x: number; y: number }[] = [];
    if (points.length === 1) {
      allPts.push(points[0]);
    } else {
      let accDist = spacing;
      allPts.push(points[0]);
      let lx = points[0].x;
      let ly = points[0].y;
      for (let i = 1; i < points.length; i++) {
        const ddx = points[i].x - lx;
        const ddy = points[i].y - ly;
        accDist += Math.sqrt(ddx * ddx + ddy * ddy);
        if (accDist >= spacing) {
          allPts.push(points[i]);
          accDist = 0;
        }
        lx = points[i].x;
        ly = points[i].y;
      }
    }
    for (const pt of allPts) {
      const grad = ctx.createRadialGradient(
        pt.x,
        pt.y,
        hardR,
        pt.x,
        pt.y,
        softR,
      );
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${opacity01})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, softR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    return;
  }

  if (shape === "circle") {
    if (points.length === 1) {
      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      return;
    }
    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = opacity / 100;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
    ctx.stroke();
    ctx.globalAlpha = savedAlpha;
  } else {
    // Continuous quadratic bezier path for non-circle shapes (no gaps)
    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = opacity / 100;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    } else if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      const last = points[points.length - 1];
      const secondLast = points[points.length - 2];
      ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
      ctx.stroke();
    }
    ctx.globalAlpha = savedAlpha;
  }
  void canvasBg;
}

/**
 * Render a vector shape onto a canvas context using CSS coordinates.
 * The context must already be scaled by DPR via ctx.scale(dpr, dpr).
 */
function renderVectorShape(
  ctx: CanvasRenderingContext2D,
  type: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  opacity: number,
) {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  switch (type) {
    case "rect":
      ctx.beginPath();
      ctx.rect(minX, minY, w, h);
      ctx.fill();
      break;
    case "circle":
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(cx, minY);
      ctx.lineTo(minX + w, minY + h);
      ctx.lineTo(minX, minY + h);
      ctx.closePath();
      ctx.fill();
      break;
    case "arrow": {
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const hw = Math.max(12, len * 0.28);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - Math.cos(ang - 0.45) * hw,
        y2 - Math.sin(ang - 0.45) * hw,
      );
      ctx.lineTo(
        x2 - Math.cos(ang + 0.45) * hw,
        y2 - Math.sin(ang + 0.45) * hw,
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "star": {
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.42;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "polygon": {
      const r = Math.min(w, h) / 2;
      const sides = 6;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const ang = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.beginPath();
      ctx.rect(minX, minY, w, h);
      ctx.fill();
  }
  ctx.restore();
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  (
    {
      brushColor,
      brushSize,
      activeTool,
      brushShape,
      brushOpacity,
      layers,
      activeLayerId,
      onLayersChange,
      canvasBg,
      pageSize,
      layerFilters,
      onLayerThumbnailUpdate,
      onColorPick,
      onEyedropperMove,
      eraserSoftness = "hard",
      brushHardness = 100,
      onCursorMove,
      onCursorLeave,
      fillTolerance = 32,
      selectionRect,
      zoom = 100,
      activeLayerLocked = false,
      shapeToolType = null,
      onTextClick,
      onStrokeEnd,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Per-layer canvas map — each layer owns its own offscreen HTMLCanvasElement
    const layerCanvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
    // History stores snapshots of full LayerData[] arrays for undo/redo
    const historyStackRef = useRef<LayerData[][]>([]);
    const redoStackRef = useRef<LayerData[][]>([]);
    const MAX_HISTORY = 50; // Upgraded from 30 to 50 steps
    const isDrawingRef = useRef(false);
    const isPanningRef = useRef(false);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const layersRef = useRef<LayerData[]>(layers);
    const canvasBgRef = useRef<string>(canvasBg);
    const pageSizeRef = useRef(pageSize);
    const lastStampPosRef = useRef<Point | null>(null);
    const activeLayerIdRef = useRef(activeLayerId);
    const onLayerThumbnailUpdateRef = useRef(onLayerThumbnailUpdate);
    const onLayersChangeRef = useRef(onLayersChange);
    const onColorPickRef = useRef(onColorPick);
    const onEyedropperMoveRef = useRef(onEyedropperMove);
    const onCursorMoveRef = useRef(onCursorMove);
    const onCursorLeaveRef = useRef(onCursorLeave);
    const isShiftRef = useRef(false);
    const eraserSoftnessRef = useRef(eraserSoftness);
    const brushHardnessRef = useRef(brushHardness);
    const zoomRef = useRef(zoom);
    const shapeToolTypeRef = useRef<string | null>(shapeToolType);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
    const activeToolRef = useRef(activeTool);
    const brushSizeRef = useRef(brushSize);
    const onTextClickRef = useRef(onTextClick);
    const onStrokeEndRef = useRef(onStrokeEnd);

    useEffect(() => {
      onLayerThumbnailUpdateRef.current = onLayerThumbnailUpdate;
    }, [onLayerThumbnailUpdate]);
    useEffect(() => {
      onLayersChangeRef.current = onLayersChange;
    }, [onLayersChange]);
    useEffect(() => {
      onColorPickRef.current = onColorPick;
    }, [onColorPick]);
    useEffect(() => {
      onEyedropperMoveRef.current = onEyedropperMove;
    }, [onEyedropperMove]);
    useEffect(() => {
      onCursorMoveRef.current = onCursorMove;
    }, [onCursorMove]);
    useEffect(() => {
      onCursorLeaveRef.current = onCursorLeave;
    }, [onCursorLeave]);
    useEffect(() => {
      eraserSoftnessRef.current = eraserSoftness;
    }, [eraserSoftness]);
    useEffect(() => {
      brushHardnessRef.current = brushHardness;
    }, [brushHardness]);
    useEffect(() => {
      zoomRef.current = zoom;
    }, [zoom]);
    useEffect(() => {
      shapeToolTypeRef.current = shapeToolType;
    }, [shapeToolType]);
    useEffect(() => {
      activeToolRef.current = activeTool;
    }, [activeTool]);
    useEffect(() => {
      brushSizeRef.current = brushSize;
    }, [brushSize]);
    useEffect(() => {
      onTextClickRef.current = onTextClick;
    }, [onTextClick]);
    useEffect(() => {
      onStrokeEndRef.current = onStrokeEnd;
    }, [onStrokeEnd]);

    // Track Shift key globally
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift") isShiftRef.current = true;
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") isShiftRef.current = false;
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    }, []);

    // ─── PER-LAYER CANVAS HELPERS ───────────────────────────────────────────

    /**
     * Get or create a per-layer offscreen canvas sized to match the page.
     */
    const getOrCreateLayerCanvas = useCallback(
      (layerId: number, width: number, height: number): HTMLCanvasElement => {
        const dpr = window.devicePixelRatio || 1;
        const physW = Math.round(width * dpr);
        const physH = Math.round(height * dpr);
        let lc = layerCanvasMapRef.current.get(layerId);
        if (!lc || lc.width !== physW || lc.height !== physH) {
          lc = document.createElement("canvas");
          lc.width = physW;
          lc.height = physH;
          const lctx = lc.getContext("2d")!;
          lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          layerCanvasMapRef.current.set(layerId, lc);
        }
        return lc;
      },
      [],
    );

    /**
     * Rebuild a single layer's canvas from its strokes array.
     */
    const syncLayerCanvas = useCallback(
      (layer: LayerData, width: number, height: number) => {
        const dpr = window.devicePixelRatio || 1;
        const lc = getOrCreateLayerCanvas(layer.id, width, height);
        const lctx = lc.getContext("2d")!;
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, lc.width, lc.height);
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const stroke of layer.strokes) {
          drawStroke(lctx, stroke, canvasBgRef.current);
        }
      },
      [getOrCreateLayerCanvas],
    );

    /**
     * Composite all visible layer canvases onto the main display canvas.
     * This is the ONLY function that draws to the main canvas.
     */
    const renderAllLayers = useCallback(
      (layersToRender: LayerData[], _width: number, _height: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const dpr = window.devicePixelRatio || 1;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        if (canvasBgRef.current === "transparent") {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = canvasBgRef.current;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        for (const layer of layersToRender) {
          if (!layer.visible) continue;
          const lc = layerCanvasMapRef.current.get(layer.id);
          if (!lc) continue;
          ctx.globalAlpha = layer.opacity / 100;
          ctx.drawImage(lc, 0, 0);
        }

        ctx.globalAlpha = 1;
        ctx.restore();
        // Restore dpr scale
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      },
      [],
    );

    // ────────────────────────────────────────────────────────────────────────

    const generateThumbnails = useCallback((currentLayers: LayerData[]) => {
      const { width, height } = pageSizeRef.current;
      const thumbs: Record<number, string> = {};
      for (const layer of currentLayers) {
        const offscreen = document.createElement("canvas");
        offscreen.width = 120;
        offscreen.height = Math.round((120 * height) / width);
        const ctx2 = offscreen.getContext("2d");
        if (!ctx2) continue;
        ctx2.fillStyle = canvasBgRef.current;
        ctx2.fillRect(0, 0, offscreen.width, offscreen.height);
        const scaleX = offscreen.width / width;
        const scaleY = offscreen.height / height;
        ctx2.save();
        ctx2.scale(scaleX, scaleY);
        if (layer.visible) {
          ctx2.globalAlpha = layer.opacity / 100;
          for (const stroke of layer.strokes) {
            drawStroke(ctx2, stroke, canvasBgRef.current);
          }
        }
        ctx2.restore();
        thumbs[layer.id] = offscreen.toDataURL("image/png", 0.6);
      }
      onLayerThumbnailUpdateRef.current?.(thumbs);
    }, []);

    // Sync all layer canvases and re-composite when layers prop changes
    useEffect(() => {
      layersRef.current = layers;
      if (!isDrawingRef.current) {
        const { width, height } = pageSizeRef.current;
        for (const layer of layers) {
          syncLayerCanvas(layer, width, height);
        }
        renderAllLayers(layers, width, height);
        generateThumbnails(layers);
      }
    }, [layers, syncLayerCanvas, renderAllLayers, generateThumbnails]);

    // Re-composite when canvas background changes
    useEffect(() => {
      canvasBgRef.current = canvasBg;
      const { width, height } = pageSizeRef.current;
      renderAllLayers(layersRef.current, width, height);
    }, [canvasBg, renderAllLayers]);

    useEffect(() => {
      pageSizeRef.current = pageSize;
    }, [pageSize]);
    useEffect(() => {
      activeLayerIdRef.current = activeLayerId;
    }, [activeLayerId]);

    const initCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = pageSizeRef.current;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Also init overlay canvas
      const oc = overlayCanvasRef.current;
      if (oc) {
        oc.width = width * dpr;
        oc.height = height * dpr;
        const octx = oc.getContext("2d");
        if (octx) {
          octx.setTransform(1, 0, 0, 1, 0, 0);
          octx.scale(dpr, dpr);
        }
      }

      // Init per-layer canvases, then composite
      for (const layer of layersRef.current) {
        syncLayerCanvas(layer, width, height);
      }
      renderAllLayers(layersRef.current, width, height);
    }, [syncLayerCanvas, renderAllLayers]);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      clearCanvas: () => {
        const activeId = activeLayerIdRef.current;
        const { width, height } = pageSizeRef.current;

        // Clear the active layer's offscreen canvas
        const lc = getOrCreateLayerCanvas(activeId, width, height);
        const lctx = lc.getContext("2d")!;
        const dpr = window.devicePixelRatio || 1;
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, lc.width, lc.height);
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const newLayers = layersRef.current.map((l) =>
          l.id === activeId ? { ...l, strokes: [] } : l,
        );
        onLayersChangeRef.current(newLayers);
        renderAllLayers(newLayers, width, height);
      },
      undoStroke: () => {
        const activeId = activeLayerIdRef.current;
        const newLayers = layersRef.current.map((l) =>
          l.id === activeId ? { ...l, strokes: l.strokes.slice(0, -1) } : l,
        );
        onLayersChangeRef.current(newLayers);
        const { width, height } = pageSizeRef.current;
        const activeLayer = newLayers.find((l) => l.id === activeId);
        if (activeLayer) syncLayerCanvas(activeLayer, width, height);
        renderAllLayers(newLayers, width, height);
      },
      getImageData: (x: number, y: number, w: number, h: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return null;
        const dpr = window.devicePixelRatio || 1;
        return ctx.getImageData(
          Math.round(x * dpr),
          Math.round(y * dpr),
          Math.round(w * dpr),
          Math.round(h * dpr),
        );
      },
      putImageData: (data: ImageData, x: number, y: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.putImageData(data, Math.round(x * dpr), Math.round(y * dpr));
        ctx.restore();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      },
      clearRegion: (x: number, y: number, w: number, h: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;
        const dpr = window.devicePixelRatio || 1;
        // Clear on the active layer canvas
        const activeId = activeLayerIdRef.current;
        const { width, height } = pageSizeRef.current;
        const lc = getOrCreateLayerCanvas(activeId, width, height);
        const lctx = lc.getContext("2d")!;
        lctx.save();
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(
          Math.round(x * dpr),
          Math.round(y * dpr),
          Math.round(w * dpr),
          Math.round(h * dpr),
        );
        lctx.restore();
        renderAllLayers(layersRef.current, width, height);
      },
      moveStrokesInRegion: (
        origRect: { x: number; y: number; w: number; h: number },
        dx: number,
        dy: number,
      ) => {
        const activeId = activeLayerIdRef.current;
        const newLayers = layersRef.current.map((l) => {
          if (l.id !== activeId) return l;
          const movedStrokes = l.strokes.map((stroke) => {
            const allPointsInRect = stroke.points.every(
              (p) =>
                p.x >= origRect.x &&
                p.x <= origRect.x + origRect.w &&
                p.y >= origRect.y &&
                p.y <= origRect.y + origRect.h,
            );
            if (allPointsInRect) {
              return {
                ...stroke,
                points: stroke.points.map((p) => ({
                  x: p.x + dx,
                  y: p.y + dy,
                })),
              };
            }
            return stroke;
          });
          return { ...l, strokes: movedStrokes };
        });
        onLayersChangeRef.current(newLayers);
        const { width, height } = pageSizeRef.current;
        const activeLayer = newLayers.find((l) => l.id === activeId);
        if (activeLayer) syncLayerCanvas(activeLayer, width, height);
        renderAllLayers(newLayers, width, height);
      },
      saveHistory: () => {
        // Save undo snapshot only on pointer up, NOT during drag/move
        // Deep-clone the current LayerData[] so strokes are immutable snapshots
        const snapshot: LayerData[] = layersRef.current.map((l) => ({
          ...l,
          strokes: l.strokes.map((s) => ({
            ...s,
            points: s.points.map((p) => ({ ...p })),
            vectorShape: s.vectorShape ? { ...s.vectorShape } : undefined,
            fillData: s.fillData
              ? new ImageData(
                  new Uint8ClampedArray(s.fillData.data),
                  s.fillData.width,
                  s.fillData.height,
                )
              : undefined,
          })),
        }));
        historyStackRef.current.push(snapshot);
        if (historyStackRef.current.length > MAX_HISTORY) {
          historyStackRef.current.shift();
        }
        // Clear redo stack when a new action is taken
        redoStackRef.current = [];
      },
      undo: () => {
        if (historyStackRef.current.length === 0) return;
        // Save current state to redo stack
        const currentSnapshot: LayerData[] = layersRef.current.map((l) => ({
          ...l,
          strokes: l.strokes.map((s) => ({
            ...s,
            points: s.points.map((p) => ({ ...p })),
            vectorShape: s.vectorShape ? { ...s.vectorShape } : undefined,
            fillData: s.fillData
              ? new ImageData(
                  new Uint8ClampedArray(s.fillData.data),
                  s.fillData.width,
                  s.fillData.height,
                )
              : undefined,
          })),
        }));
        redoStackRef.current.push(currentSnapshot);

        // Restore previous state — activeLayerId is preserved (never reset)
        const prevSnapshot = historyStackRef.current.pop()!;
        onLayersChangeRef.current(prevSnapshot);
        const { width, height } = pageSizeRef.current;
        for (const layer of prevSnapshot) {
          syncLayerCanvas(layer, width, height);
        }
        renderAllLayers(prevSnapshot, width, height);
        generateThumbnails(prevSnapshot);
      },
      redo: () => {
        if (redoStackRef.current.length === 0) return;
        // Save current state to history
        const currentSnapshot: LayerData[] = layersRef.current.map((l) => ({
          ...l,
          strokes: l.strokes.map((s) => ({
            ...s,
            points: s.points.map((p) => ({ ...p })),
            vectorShape: s.vectorShape ? { ...s.vectorShape } : undefined,
            fillData: s.fillData
              ? new ImageData(
                  new Uint8ClampedArray(s.fillData.data),
                  s.fillData.width,
                  s.fillData.height,
                )
              : undefined,
          })),
        }));
        historyStackRef.current.push(currentSnapshot);
        if (historyStackRef.current.length > MAX_HISTORY) {
          historyStackRef.current.shift();
        }

        // Restore redo state — activeLayerId is preserved (never reset)
        const nextSnapshot = redoStackRef.current.pop()!;
        onLayersChangeRef.current(nextSnapshot);
        const { width, height } = pageSizeRef.current;
        for (const layer of nextSnapshot) {
          syncLayerCanvas(layer, width, height);
        }
        renderAllLayers(nextSnapshot, width, height);
        generateThumbnails(nextSnapshot);
      },
      snapshotCanvas: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return null;
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      },
      bakeToFlatLayer: () => {
        // No-op: flat layer concept removed in favor of per-layer canvases
      },
      getCompositeThumbnail: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const tmp = document.createElement("canvas");
        tmp.width = 120;
        tmp.height = 120;
        const ctx2 = tmp.getContext("2d");
        if (!ctx2) return null;
        ctx2.drawImage(canvas, 0, 0, tmp.width, tmp.height);
        return tmp.toDataURL("image/png", 0.6);
      },
      drawText: (
        x: number,
        y: number,
        text: string,
        fontFamily: string,
        fontSize: number,
        fontWeight: string,
        fontStyle: string,
        color: string,
        textAlign: CanvasTextAlign,
        underline: boolean,
      ) => {
        const activeId = activeLayerIdRef.current;
        const { width, height } = pageSizeRef.current;
        const lc = getOrCreateLayerCanvas(activeId, width, height);
        const lctx = lc.getContext("2d")!;
        lctx.save();
        lctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        lctx.fillStyle = color;
        lctx.textAlign = textAlign;
        lctx.globalAlpha = 1;
        if (underline) {
          const metrics = lctx.measureText(text);
          const tw = metrics.width;
          const xOff =
            textAlign === "center" ? -tw / 2 : textAlign === "right" ? -tw : 0;
          lctx.beginPath();
          lctx.strokeStyle = color;
          lctx.lineWidth = Math.max(1, fontSize * 0.05);
          lctx.moveTo(x + xOff, y + fontSize * 0.15);
          lctx.lineTo(x + xOff + tw, y + fontSize * 0.15);
          lctx.stroke();
        }
        lctx.fillText(text, x, y);
        lctx.restore();
        renderAllLayers(layersRef.current, width, height);
        generateThumbnails(layersRef.current);
      },

      // ── Per-layer access methods (for transform tool) ──────────────────
      getLayerCanvas: (layerId: number) => {
        const { width, height } = pageSizeRef.current;
        return getOrCreateLayerCanvas(layerId, width, height);
      },
      getLayerImageData: (layerId: number) => {
        const { width, height } = pageSizeRef.current;
        const lc = getOrCreateLayerCanvas(layerId, width, height);
        const lctx = lc.getContext("2d");
        if (!lctx) return null;
        return lctx.getImageData(0, 0, lc.width, lc.height);
      },
      putLayerImageData: (layerId: number, data: ImageData) => {
        const { width, height } = pageSizeRef.current;
        const lc = getOrCreateLayerCanvas(layerId, width, height);
        const lctx = lc.getContext("2d");
        if (!lctx) return;
        lctx.save();
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.putImageData(data, 0, 0);
        lctx.restore();
        renderAllLayers(layersRef.current, width, height);
      },

      // ── Vector stroke access methods (for Transform Tool) ─────────────────

      getLayerStrokes: (layerId: number): Stroke[] => {
        const layer = layersRef.current.find((l) => l.id === layerId);
        if (!layer) return [];
        // Deep clone so callers cannot accidentally mutate internal state
        return layer.strokes.map((s) => ({
          ...s,
          points: s.points.map((p) => ({ ...p })),
          vectorShape: s.vectorShape ? { ...s.vectorShape } : undefined,
        }));
      },

      setLayerStrokes: (layerId: number, strokes: Stroke[]): void => {
        const newLayers = layersRef.current.map((l) =>
          l.id === layerId ? { ...l, strokes } : l,
        );
        onLayersChangeRef.current(newLayers);
        const { width, height } = pageSizeRef.current;
        const updatedLayer = newLayers.find((l) => l.id === layerId);
        if (updatedLayer) syncLayerCanvas(updatedLayer, width, height);
        renderAllLayers(newLayers, width, height);
        generateThumbnails(newLayers);
      },

      getStrokesBoundingBox: (
        layerId: number,
        strokeIndices?: number[],
      ): { x: number; y: number; width: number; height: number } | null => {
        const layer = layersRef.current.find((l) => l.id === layerId);
        if (!layer || layer.strokes.length === 0) return null;

        const candidates =
          strokeIndices !== undefined
            ? strokeIndices
                .filter((i) => i >= 0 && i < layer.strokes.length)
                .map((i) => layer.strokes[i])
            : layer.strokes;

        if (candidates.length === 0) return null;

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let hasData = false;

        for (const stroke of candidates) {
          if (stroke.vectorShape) {
            // VectorShape: bounds come directly from the x1/y1/x2/y2 coords
            const { x1, y1, x2, y2 } = stroke.vectorShape;
            minX = Math.min(minX, x1, x2);
            minY = Math.min(minY, y1, y2);
            maxX = Math.max(maxX, x1, x2);
            maxY = Math.max(maxY, y1, y2);
            hasData = true;
          } else if (stroke.fillData) {
            // Fill strokes cover the entire canvas (no tight bounds available);
            // use the page size as a conservative bound.
            const { width, height } = pageSizeRef.current;
            minX = Math.min(minX, 0);
            minY = Math.min(minY, 0);
            maxX = Math.max(maxX, width);
            maxY = Math.max(maxY, height);
            hasData = true;
          } else if (stroke.points.length > 0) {
            // Regular brush / eraser stroke: scan every point
            const halfSize = stroke.size / 2;
            for (const p of stroke.points) {
              minX = Math.min(minX, p.x - halfSize);
              minY = Math.min(minY, p.y - halfSize);
              maxX = Math.max(maxX, p.x + halfSize);
              maxY = Math.max(maxY, p.y + halfSize);
            }
            hasData = true;
          }
        }

        if (!hasData || minX === Number.POSITIVE_INFINITY) return null;

        return {
          x: minX,
          y: minY,
          width: Math.max(0, maxX - minX),
          height: Math.max(0, maxY - minY),
        };
      },

      getStrokesInRect: (
        layerId: number,
        rect: { x: number; y: number; width: number; height: number },
      ): number[] => {
        const layer = layersRef.current.find((l) => l.id === layerId);
        if (!layer) return [];

        const result: number[] = [];
        const rx1 = rect.x;
        const ry1 = rect.y;
        const rx2 = rect.x + rect.width;
        const ry2 = rect.y + rect.height;

        for (let i = 0; i < layer.strokes.length; i++) {
          const stroke = layer.strokes[i];
          let sx1: number;
          let sy1: number;
          let sx2: number;
          let sy2: number;

          if (stroke.vectorShape) {
            sx1 = Math.min(stroke.vectorShape.x1, stroke.vectorShape.x2);
            sy1 = Math.min(stroke.vectorShape.y1, stroke.vectorShape.y2);
            sx2 = Math.max(stroke.vectorShape.x1, stroke.vectorShape.x2);
            sy2 = Math.max(stroke.vectorShape.y1, stroke.vectorShape.y2);
          } else if (stroke.fillData) {
            // Fill strokes always intersect any rect
            result.push(i);
            continue;
          } else if (stroke.points.length > 0) {
            const halfSize = stroke.size / 2;
            sx1 = Number.POSITIVE_INFINITY;
            sy1 = Number.POSITIVE_INFINITY;
            sx2 = Number.NEGATIVE_INFINITY;
            sy2 = Number.NEGATIVE_INFINITY;
            for (const p of stroke.points) {
              sx1 = Math.min(sx1, p.x - halfSize);
              sy1 = Math.min(sy1, p.y - halfSize);
              sx2 = Math.max(sx2, p.x + halfSize);
              sy2 = Math.max(sy2, p.y + halfSize);
            }
          } else {
            continue;
          }

          // AABB intersection test
          if (sx2 >= rx1 && sx1 <= rx2 && sy2 >= ry1 && sy1 <= ry2) {
            result.push(i);
          }
        }

        return result;
      },

      redrawLayerFromStrokes: (layerId: number): void => {
        const { width, height } = pageSizeRef.current;
        const layer = layersRef.current.find((l) => l.id === layerId);
        if (!layer) return;
        syncLayerCanvas(layer, width, height);
        renderAllLayers(layersRef.current, width, height);
      },
    }));

    useEffect(() => {
      initCanvas();
    }, [initCanvas]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    useEffect(() => {
      initCanvas();
    }, [pageSize.width, pageSize.height, initCanvas]);

    /**
     * Convert mouse/touch event to logical canvas coordinates.
     */
    const getPos = useCallback(
      (e: React.MouseEvent | React.TouchEvent): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const zf = zoomRef.current / 100;
        if ("touches" in e) {
          const touch = e.touches[0];
          if (!touch) return null;
          return {
            x: (touch.clientX - rect.left) / zf,
            y: (touch.clientY - rect.top) / zf,
          };
        }
        return {
          x: ((e as React.MouseEvent).clientX - rect.left) / zf,
          y: ((e as React.MouseEvent).clientY - rect.top) / zf,
        };
      },
      [],
    );

    const canDraw = activeTool === "brush" || activeTool === "eraser";

    const startDrawing = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!canDraw) return;
        if (activeLayerLocked) return;
        e.preventDefault();
        const pos = getPos(e);
        if (!pos) return;

        isDrawingRef.current = true;
        lastStampPosRef.current = pos;
        currentStrokeRef.current = {
          points: [pos],
          color: brushColor,
          size: brushSize,
          isEraser: activeTool === "eraser",
          shape: brushShape,
          opacity: brushOpacity,
          eraserSoftness:
            activeTool === "eraser" ? eraserSoftnessRef.current : undefined,
          hardness: activeTool === "brush" ? brushHardnessRef.current : 100,
        };

        // Draw the initial point to the active layer canvas
        const { width, height } = pageSizeRef.current;
        const lc = getOrCreateLayerCanvas(
          activeLayerIdRef.current,
          width,
          height,
        );
        const lctx = lc.getContext("2d");
        if (lctx && currentStrokeRef.current) {
          if (activeTool === "eraser") {
            drawEraserStroke(lctx, currentStrokeRef.current);
          } else {
            drawStroke(lctx, currentStrokeRef.current, canvasBgRef.current);
          }
        }
        renderAllLayers(layersRef.current, width, height);
      },
      [
        brushColor,
        brushSize,
        activeTool,
        brushShape,
        brushOpacity,
        getPos,
        canDraw,
        activeLayerLocked,
        getOrCreateLayerCanvas,
        renderAllLayers,
      ],
    );

    const draw = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        // Draw cursor on overlay canvas (brush/eraser circle preview)
        const canvas = canvasRef.current;
        const cursorPos = getPos(e);
        if (canvas && cursorPos) {
          const oc = overlayCanvasRef.current;
          if (oc && !shapeStartRef.current) {
            const octx = oc.getContext("2d");
            if (octx) {
              const { width, height } = pageSizeRef.current;
              octx.clearRect(0, 0, width, height);
              const tool = activeToolRef.current;
              if (tool === "brush" || tool === "eraser") {
                const r = Math.max(1, brushSizeRef.current / 2);
                octx.save();
                octx.beginPath();
                octx.arc(cursorPos.x, cursorPos.y, r, 0, Math.PI * 2);
                octx.strokeStyle = "rgba(255,255,255,0.9)";
                octx.lineWidth = 1.5;
                octx.stroke();
                octx.beginPath();
                octx.arc(cursorPos.x, cursorPos.y, r + 0.5, 0, Math.PI * 2);
                octx.strokeStyle = "rgba(0,0,0,0.5)";
                octx.lineWidth = 0.8;
                octx.stroke();
                octx.beginPath();
                octx.arc(cursorPos.x, cursorPos.y, 1, 0, Math.PI * 2);
                octx.fillStyle = "rgba(255,255,255,0.8)";
                octx.fill();
                octx.restore();
              }
              if (tool === "fill") {
                const cx = cursorPos.x;
                const cy = cursorPos.y;
                octx.save();
                octx.beginPath();
                octx.arc(cx, cy, 6, 0, Math.PI * 2);
                octx.fillStyle = "rgba(255,200,0,0.85)";
                octx.fill();
                octx.beginPath();
                octx.arc(cx, cy, 6, 0, Math.PI * 2);
                octx.strokeStyle = "rgba(0,0,0,0.6)";
                octx.lineWidth = 1.5;
                octx.stroke();
                octx.strokeStyle = "rgba(0,0,0,0.8)";
                octx.lineWidth = 1;
                octx.beginPath();
                octx.moveTo(cx - 10, cy);
                octx.lineTo(cx - 7, cy);
                octx.stroke();
                octx.beginPath();
                octx.moveTo(cx + 7, cy);
                octx.lineTo(cx + 10, cy);
                octx.stroke();
                octx.beginPath();
                octx.moveTo(cx, cy - 10);
                octx.lineTo(cx, cy - 7);
                octx.stroke();
                octx.beginPath();
                octx.moveTo(cx, cy + 7);
                octx.lineTo(cx, cy + 10);
                octx.stroke();
                octx.restore();
              }
            }
          }
        }

        // Handle eyedropper hover — reads from COMPOSITE main canvas (correct)
        if (activeTool === "colorpicker") {
          if (canvas) {
            const pos = getPos(e);
            if (pos) {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                const px = Math.max(0, Math.round(pos.x * dpr));
                const py = Math.max(0, Math.round(pos.y * dpr));
                const pixel = ctx.getImageData(px, py, 1, 1).data;
                const hex =
                  pixel[3] < 10
                    ? canvasBgRef.current
                    : `#${[pixel[0], pixel[1], pixel[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
                const rect = canvas.getBoundingClientRect();
                onEyedropperMoveRef.current?.(
                  hex,
                  rect.left + pos.x,
                  rect.top + pos.y,
                );
              }
            }
          }
          return;
        }

        // ─── SHAPE PREVIEW ───
        if (activeTool === "shape" && shapeStartRef.current) {
          const pos = getPos(e);
          if (!pos) return;
          const oc = overlayCanvasRef.current;
          if (oc) {
            const octx = oc.getContext("2d");
            if (octx) {
              const { width, height } = pageSizeRef.current;
              octx.clearRect(0, 0, width, height);
              renderVectorShape(
                octx,
                shapeToolTypeRef.current || "rect",
                shapeStartRef.current.x,
                shapeStartRef.current.y,
                pos.x,
                pos.y,
                brushColor,
                brushOpacity,
              );
            }
          }
          return;
        }

        if (!canDraw) return;
        e.preventDefault();
        if (!isDrawingRef.current || !currentStrokeRef.current) return;

        const pos = getPos(e);
        if (!pos) return;

        if (!canvas) return;

        // Get the active layer canvas for drawing
        const { width, height } = pageSizeRef.current;
        const lc = getOrCreateLayerCanvas(
          activeLayerIdRef.current,
          width,
          height,
        );
        const lctx = lc.getContext("2d")!;

        const stroke = currentStrokeRef.current;

        if (stroke.isEraser) {
          if (isShiftRef.current && stroke.points.length >= 1) {
            const startPt = stroke.points[0];
            stroke.points = [startPt, pos];
            // Rebuild layer canvas for clean straight-line eraser preview
            syncLayerCanvas(
              layersRef.current.find((l) => l.id === activeLayerIdRef.current)!,
              width,
              height,
            );
            drawEraserStroke(lctx, stroke);
          } else {
            stroke.points.push(pos);
            const savedOp = lctx.globalCompositeOperation;
            lctx.globalCompositeOperation = "destination-out";
            const softness = stroke.eraserSoftness;
            if (softness === "soft") {
              const grad = lctx.createRadialGradient(
                pos.x,
                pos.y,
                0,
                pos.x,
                pos.y,
                stroke.size / 2,
              );
              grad.addColorStop(0, "rgba(0,0,0,1)");
              grad.addColorStop(1, "rgba(0,0,0,0)");
              lctx.beginPath();
              lctx.arc(pos.x, pos.y, stroke.size / 2, 0, Math.PI * 2);
              lctx.fillStyle = grad;
              lctx.fill();
            } else {
              const pts = stroke.points;
              if (pts.length === 2) {
                lctx.beginPath();
                lctx.strokeStyle = "rgba(0,0,0,1)";
                lctx.lineWidth = stroke.size;
                lctx.lineCap = "round";
                lctx.lineJoin = "round";
                lctx.moveTo(pts[0].x, pts[0].y);
                lctx.lineTo(pts[1].x, pts[1].y);
                lctx.stroke();
              } else if (pts.length > 2) {
                const i = pts.length - 2;
                const midX = (pts[i].x + pts[i + 1].x) / 2;
                const midY = (pts[i].y + pts[i + 1].y) / 2;
                const prevMidX = (pts[i - 1].x + pts[i].x) / 2;
                const prevMidY = (pts[i - 1].y + pts[i].y) / 2;
                lctx.beginPath();
                lctx.strokeStyle = "rgba(0,0,0,1)";
                lctx.lineWidth = stroke.size;
                lctx.lineCap = "round";
                lctx.lineJoin = "round";
                lctx.moveTo(prevMidX, prevMidY);
                lctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
                lctx.stroke();
              }
            }
            lctx.globalCompositeOperation = savedOp;
          }
          renderAllLayers(layersRef.current, width, height);
          return;
        }

        stroke.points.push(pos);

        const color = stroke.color;

        if (stroke.shape === "circle") {
          const pts = stroke.points;
          const savedAlpha = lctx.globalAlpha;
          lctx.globalAlpha = stroke.opacity / 100;
          lctx.beginPath();
          lctx.strokeStyle = color;
          lctx.lineWidth = stroke.size;
          lctx.lineCap = "round";
          lctx.lineJoin = "round";
          if (pts.length === 2) {
            lctx.moveTo(pts[0].x, pts[0].y);
            lctx.lineTo(pts[1].x, pts[1].y);
          } else if (pts.length > 2) {
            const i = pts.length - 2;
            const midX = (pts[i].x + pts[i + 1].x) / 2;
            const midY = (pts[i].y + pts[i + 1].y) / 2;
            const prevMidX = (pts[i - 1].x + pts[i].x) / 2;
            const prevMidY = (pts[i - 1].y + pts[i].y) / 2;
            lctx.moveTo(prevMidX, prevMidY);
            lctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
          }
          lctx.stroke();
          lctx.globalAlpha = savedAlpha;
        } else {
          const pts = stroke.points;
          if (pts.length >= 2) {
            const i = pts.length - 2;
            const midX = (pts[i].x + pts[i + 1].x) / 2;
            const midY = (pts[i].y + pts[i + 1].y) / 2;
            const prevMidX = i > 0 ? (pts[i - 1].x + pts[i].x) / 2 : pts[i].x;
            const prevMidY = i > 0 ? (pts[i - 1].y + pts[i].y) / 2 : pts[i].y;
            const savedAlpha2 = lctx.globalAlpha;
            lctx.beginPath();
            lctx.strokeStyle = color;
            lctx.lineWidth = stroke.size;
            lctx.lineCap = "round";
            lctx.lineJoin = "round";
            lctx.globalAlpha = stroke.opacity / 100;
            lctx.moveTo(prevMidX, prevMidY);
            lctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
            lctx.stroke();
            lctx.globalAlpha = savedAlpha2;
          }
        }

        renderAllLayers(layersRef.current, width, height);
      },
      [
        getPos,
        canDraw,
        activeTool,
        brushColor,
        brushOpacity,
        getOrCreateLayerCanvas,
        syncLayerCanvas,
        renderAllLayers,
      ],
    );

    const stopDrawing = useCallback(() => {
      if (!isDrawingRef.current || !currentStrokeRef.current) return;
      isDrawingRef.current = false;
      lastStampPosRef.current = null;

      if (currentStrokeRef.current.points.length > 0) {
        const activeId = activeLayerIdRef.current;
        // Save pre-stroke snapshot for undo history
        onStrokeEndRef.current?.(layersRef.current);
        const newLayers = layersRef.current.map((l) =>
          l.id === activeId
            ? { ...l, strokes: [...l.strokes, currentStrokeRef.current!] }
            : l,
        );
        onLayersChangeRef.current(newLayers);

        // Sync the active layer canvas from its complete strokes (ensures correctness)
        const { width, height } = pageSizeRef.current;
        const activeLayer = newLayers.find((l) => l.id === activeId);
        if (activeLayer) syncLayerCanvas(activeLayer, width, height);
        renderAllLayers(newLayers, width, height);
        generateThumbnails(newLayers);
      }

      currentStrokeRef.current = null;
    }, [generateThumbnails, syncLayerCanvas, renderAllLayers]);

    // Determine canvas cursor style
    const getCursor = () => {
      if (activeTool === "pan") {
        return isPanningRef.current ? "grabbing" : "grab";
      }
      switch (activeTool) {
        case "select":
          return "crosshair";
        case "eraser":
          return "none";
        case "brush":
          return "none";
        case "fill":
          return "none";
        case "text":
          return "text";
        case "colorpicker":
          return "crosshair";
        case "layers":
          return "default";
        default:
          return "crosshair";
      }
    };

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (activeTool === "pan") {
          isPanningRef.current = true;
          const canvas = canvasRef.current;
          if (canvas) canvas.style.cursor = "grabbing";
          return;
        }

        if (activeLayerLocked && activeTool !== "colorpicker") return;

        // ─── VECTOR SHAPE DRAWING ───
        if (activeTool === "shape") {
          const pos = getPos(e);
          if (!pos) return;
          shapeStartRef.current = pos;
          return;
        }

        // ─── FLOOD FILL ───
        if (activeTool === "fill") {
          const pos = getPos(e);
          if (!pos) return;

          const { width, height } = pageSizeRef.current;
          const activeId = activeLayerIdRef.current;

          // Save undo snapshot BEFORE the fill
          onStrokeEndRef.current?.(layersRef.current);

          // Run flood fill on the ACTIVE LAYER canvas only
          const lc = getOrCreateLayerCanvas(activeId, width, height);
          const result = floodFill(
            lc,
            pos.x,
            pos.y,
            brushColor,
            fillTolerance,
            selectionRect,
          );

          if (result) {
            // Store fill result as a stroke object so undo/visibility work
            const fillStroke: Stroke = {
              points: [],
              color: brushColor,
              size: 0,
              isEraser: false,
              shape: "circle" as BrushShape,
              opacity: 100,
              fillData: result,
            };

            const newLayers = layersRef.current.map((l) =>
              l.id === activeId
                ? { ...l, strokes: [...l.strokes, fillStroke] }
                : l,
            );
            onLayersChangeRef.current(newLayers);
            // Layer canvas already has fill applied from floodFill above
            renderAllLayers(newLayers, width, height);
            generateThumbnails(newLayers);
          }
          return;
        }

        // Eyedropper pick on click — reads from composite main canvas
        if (activeTool === "colorpicker") {
          const pos = getPos(e);
          if (!pos) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const dpr = window.devicePixelRatio || 1;
          const px = Math.round(pos.x * dpr);
          const py = Math.round(pos.y * dpr);
          const pixel = ctx.getImageData(px, py, 1, 1).data;
          const hex =
            pixel[3] < 10
              ? canvasBgRef.current
              : `#${[pixel[0], pixel[1], pixel[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
          onColorPickRef.current?.(hex);
          return;
        }

        // ─── TEXT TOOL ───
        if (activeTool === "text") {
          const pos = getPos(e);
          if (!pos) return;
          const clientX = (e as React.MouseEvent).clientX;
          const clientY = (e as React.MouseEvent).clientY;
          onTextClickRef.current?.(pos.x, pos.y, clientX, clientY);
          return;
        }

        startDrawing(e);
      },
      [
        activeTool,
        startDrawing,
        getPos,
        brushColor,
        generateThumbnails,
        fillTolerance,
        selectionRect,
        activeLayerLocked,
        getOrCreateLayerCanvas,
        renderAllLayers,
      ],
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        if (activeTool === "pan") {
          isPanningRef.current = false;
          const canvas = canvasRef.current;
          if (canvas) canvas.style.cursor = "grab";
          return;
        }

        // ─── FINALIZE SHAPE ───
        if (activeTool === "shape" && shapeStartRef.current) {
          const pos = getPos(e);
          if (pos) {
            const newStroke: Stroke = {
              points: [],
              color: brushColor,
              size: 1,
              isEraser: false,
              shape: "circle",
              opacity: brushOpacity,
              vectorShape: {
                type: shapeToolTypeRef.current || "rect",
                x1: shapeStartRef.current.x,
                y1: shapeStartRef.current.y,
                x2: pos.x,
                y2: pos.y,
              },
            };

            const activeId = activeLayerIdRef.current;
            // Save pre-stroke snapshot for undo history
            onStrokeEndRef.current?.(layersRef.current);
            const newLayers = layersRef.current.map((l) =>
              l.id === activeId
                ? { ...l, strokes: [...l.strokes, newStroke] }
                : l,
            );
            onLayersChangeRef.current(newLayers);

            // Sync the active layer canvas with the new shape
            const { width, height } = pageSizeRef.current;
            const activeLayer = newLayers.find((l) => l.id === activeId);
            if (activeLayer) syncLayerCanvas(activeLayer, width, height);
            renderAllLayers(newLayers, width, height);
            generateThumbnails(newLayers);
          }

          const oc = overlayCanvasRef.current;
          if (oc) {
            const octx = oc.getContext("2d");
            if (octx) {
              const { width, height } = pageSizeRef.current;
              octx.clearRect(0, 0, width, height);
            }
          }
          shapeStartRef.current = null;
          return;
        }

        stopDrawing();
      },
      [
        activeTool,
        stopDrawing,
        getPos,
        brushColor,
        brushOpacity,
        generateThumbnails,
        syncLayerCanvas,
        renderAllLayers,
      ],
    );

    const handleMouseLeave = useCallback(
      (_e: React.MouseEvent) => {
        onEyedropperMoveRef.current?.(null, 0, 0);
        onCursorLeaveRef.current?.();
        // Clear cursor from overlay canvas
        const oc = overlayCanvasRef.current;
        if (oc && !shapeStartRef.current) {
          const octx = oc.getContext("2d");
          const { width, height } = pageSizeRef.current;
          if (octx) octx.clearRect(0, 0, width, height);
        }
        if (activeTool === "pan") {
          isPanningRef.current = false;
          const canvas = canvasRef.current;
          if (canvas) canvas.style.cursor = "grab";
          return;
        }
        stopDrawing();
      },
      [activeTool, stopDrawing],
    );

    const handleTouchEnd = useCallback(() => {
      onCursorLeaveRef.current?.();
      const oc = overlayCanvasRef.current;
      if (oc && !shapeStartRef.current) {
        const octx = oc.getContext("2d");
        const { width, height } = pageSizeRef.current;
        if (octx) octx.clearRect(0, 0, width, height);
      }
      stopDrawing();
    }, [stopDrawing]);

    // Suppress unused variable warnings for refs used only internally
    void lastStampPosRef;
    void onCursorMoveRef;

    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${pageSize.width}px`,
            height: `${pageSize.height}px`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: `${pageSize.width}px`,
            height: `${pageSize.height}px`,
            cursor: getCursor(),
            touchAction: "none",
            background: canvasBg,
            boxShadow: "0 4px 32px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.08)",
            filter:
              layerFilters && activeLayerId && layerFilters[activeLayerId]
                ? `blur(${layerFilters[activeLayerId].blur}px) brightness(${layerFilters[activeLayerId].brightness}%) contrast(${layerFilters[activeLayerId].contrast}%)`
                : undefined,
            opacity:
              layerFilters && activeLayerId && layerFilters[activeLayerId]
                ? layerFilters[activeLayerId].opacity / 100
                : 1,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={draw}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={handleTouchEnd}
          data-ocid="drawing.canvas_target"
        />
      </div>
    );
  },
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
