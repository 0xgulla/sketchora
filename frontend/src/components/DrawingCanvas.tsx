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
  | "star";

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
  /** Fill tool: flags this as a fill operation */
  isFill?: boolean;
  /** Fill tool: snapshot of layer physical pixels AFTER fill (for undo replay) */
  fillImageData?: ImageData;
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
  importImage: (img: HTMLImageElement) => void;
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
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Parse any CSS color string into RGBA components (0-255). */
function parseCssColor(color: string): { r: number; g: number; b: number; a: number } {
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = 1;
  const ctx = tmp.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], a: d[3] };
}

/**
 * Stack-based flood fill.
 * Operates entirely on physical pixel coordinates inside ImageData.
 * Modifies imageData.data in-place — caller is responsible for putImageData.
 */
function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: { r: number; g: number; b: number; a: number },
  tolerance: number,
): void {
  const { width, height, data } = imageData;
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return;

  const startIdx = (startY * width + startX) * 4;
  const tR = data[startIdx];
  const tG = data[startIdx + 1];
  const tB = data[startIdx + 2];
  const tA = data[startIdx + 3];

  // Bail if target pixel already matches fill colour
  if (
    Math.abs(tR - fillColor.r) +
      Math.abs(tG - fillColor.g) +
      Math.abs(tB - fillColor.b) +
      Math.abs(tA - fillColor.a) <=
    tolerance
  )
    return;

  const visited = new Uint8Array(width * height);
  const stack: number[] = [startY * width + startX];

  while (stack.length > 0) {
    const pos = stack.pop()!;
    if (visited[pos]) continue;
    visited[pos] = 1;

    const x = pos % width;
    const y = (pos / width) | 0;
    const idx = pos * 4;

    const diff =
      Math.abs(data[idx] - tR) +
      Math.abs(data[idx + 1] - tG) +
      Math.abs(data[idx + 2] - tB) +
      Math.abs(data[idx + 3] - tA);
    if (diff > tolerance * 4) continue;

    data[idx] = fillColor.r;
    data[idx + 1] = fillColor.g;
    data[idx + 2] = fillColor.b;
    data[idx + 3] = 255;

    if (x + 1 < width) stack.push(pos + 1);
    if (x - 1 >= 0) stack.push(pos - 1);
    if (y + 1 < height) stack.push(pos + width);
    if (y - 1 >= 0) stack.push(pos - width);
  }
}

/** Draw a single shape stamp at (x,y). */
function drawShape(
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
  ctx.beginPath();
  const r = size / 2;
  switch (shape) {
    case "circle":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case "square":
      ctx.rect(x - r, y - r, size, size);
      break;
    case "rectangle": {
      const hw = r;
      const hh = r * 0.5;
      ctx.rect(x - hw, y - hh, hw * 2, hh * 2);
      break;
    }
    case "triangle": {
      const h = size;
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + h / 2, y + h / 2);
      ctx.lineTo(x - h / 2, y + h / 2);
      ctx.closePath();
      break;
    }
    case "diamond":
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;
    case "star": {
      const outerR = r;
      const innerR = r * 0.45;
      const pts = 5;
      for (let i = 0; i < pts * 2; i++) {
        const angle = (i * Math.PI) / pts - Math.PI / 2;
        const rad = i % 2 === 0 ? outerR : innerR;
        const px = x + Math.cos(angle) * rad;
        const py = y + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
  }
  ctx.fill();
  ctx.globalAlpha = savedAlpha;
}

/**
 * Draw a stroke's path/shape onto ctx.
 * Caller must configure globalCompositeOperation for eraser before calling.
 * This function always uses stroke.color (never background color).
 */
function drawStrokeOnCtx(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const { shape, size, points, opacity, color } = stroke;
  if (points.length === 0) return;

  if (shape === "circle") {
    if (points.length === 1) {
      drawShape(ctx, "circle", points[0].x, points[0].y, size, color, opacity);
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
    const spacing = Math.max(2, size * 0.4);
    let accDist = spacing;
    drawShape(ctx, shape, points[0].x, points[0].y, size, color, opacity);
    let lastX = points[0].x;
    let lastY = points[0].y;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - lastX;
      const dy = points[i].y - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      accDist += dist;
      if (accDist >= spacing) {
        drawShape(ctx, shape, points[i].x, points[i].y, size, color, opacity);
        accDist = 0;
      }
      lastX = points[i].x;
      lastY = points[i].y;
    }
  }
}

/**
 * Rebuild a layer's offscreen canvas from its strokes array.
 * Handles path strokes, eraser strokes (destination-out), and fill strokes (putImageData).
 */
function rebuildLayerCanvas(
  layerCanvas: HTMLCanvasElement,
  layer: LayerData,
  dpr: number,
) {
  const ctx = layerCanvas.getContext("2d")!;

  // Clear in physical pixel space (bypasses any transform)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  for (const stroke of layer.strokes) {
    if (stroke.isFill && stroke.fillImageData) {
      // Restore the fill snapshot directly in physical pixel space
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(stroke.fillImageData, 0, 0);
      ctx.restore();
    } else if (stroke.isEraser) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      // For destination-out, color doesn't matter – only alpha does.
      // Use black with the stroke's opacity.
      const eraserStroke: Stroke = { ...stroke, color: "#000000" };
      drawStrokeOnCtx(ctx, eraserStroke);
      ctx.restore();
    } else {
      drawStrokeOnCtx(ctx, stroke);
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
    },
    ref,
  ) => {
    /** The visible display canvas (composited output only). */
    const canvasRef = useRef<HTMLCanvasElement>(null);
    /** One offscreen canvas per layer – the true source of pixel data. */
    const layerCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
    /** Track per-layer stroke counts to detect undo (count decrease). */
    const layerStrokeCountsRef = useRef<Map<number, number>>(new Map());

    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const lastStampPosRef = useRef<Point | null>(null);

    // Stable refs for values used inside event handlers
    const layersRef = useRef(layers);
    const canvasBgRef = useRef(canvasBg);
    const pageSizeRef = useRef(pageSize);
    const activeLayerIdRef = useRef(activeLayerId);
    const brushColorRef = useRef(brushColor);
    const brushSizeRef = useRef(brushSize);
    const brushShapeRef = useRef(brushShape);
    const brushOpacityRef = useRef(brushOpacity);
    const onLayersChangeRef = useRef(onLayersChange);
    const onLayerThumbnailUpdateRef = useRef(onLayerThumbnailUpdate);

    useEffect(() => { layersRef.current = layers; }, [layers]);
    useEffect(() => { canvasBgRef.current = canvasBg; }, [canvasBg]);
    useEffect(() => { pageSizeRef.current = pageSize; }, [pageSize]);
    useEffect(() => { activeLayerIdRef.current = activeLayerId; }, [activeLayerId]);
    useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
    useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
    useEffect(() => { brushShapeRef.current = brushShape; }, [brushShape]);
    useEffect(() => { brushOpacityRef.current = brushOpacity; }, [brushOpacity]);
    useEffect(() => { onLayersChangeRef.current = onLayersChange; }, [onLayersChange]);
    useEffect(() => { onLayerThumbnailUpdateRef.current = onLayerThumbnailUpdate; }, [onLayerThumbnailUpdate]);

    const getDpr = () => window.devicePixelRatio || 1;

    // -----------------------------------------------------------------------
    // Layer canvas management
    // -----------------------------------------------------------------------

    /** Get-or-create the offscreen canvas for a layer at current page size. */
    const ensureLayerCanvas = useCallback((layerId: number): HTMLCanvasElement => {
      const { width, height } = pageSizeRef.current;
      const dpr = getDpr();
      const physW = Math.round(width * dpr);
      const physH = Math.round(height * dpr);

      const existing = layerCanvasesRef.current.get(layerId);
      if (existing && existing.width === physW && existing.height === physH) {
        return existing;
      }

      const c = document.createElement("canvas");
      c.width = physW;
      c.height = physH;
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);

      if (existing) {
        // Resize: blit old content at new size
        ctx.drawImage(existing, 0, 0, width, height);
      }

      layerCanvasesRef.current.set(layerId, c);
      return c;
    }, []);

    // -----------------------------------------------------------------------
    // Rendering pipeline — MAIN CANVAS IS DISPLAY ONLY
    // -----------------------------------------------------------------------

    /**
     * Composite all visible layer canvases onto the main display canvas.
     * This is the ONLY function that touches the main canvas.
     */
    const renderAllLayers = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      // Work in physical pixel space so the 1:1 drawImage copy is exact.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background fill
      ctx.fillStyle = canvasBgRef.current;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Composite each visible layer
      for (const layer of layersRef.current) {
        if (!layer.visible) continue;
        const lc = layerCanvasesRef.current.get(layer.id);
        if (!lc) continue;
        ctx.globalAlpha = layer.opacity / 100;
        ctx.drawImage(lc, 0, 0); // pixel-for-pixel copy
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }, []);

    // -----------------------------------------------------------------------
    // Thumbnails
    // -----------------------------------------------------------------------

    const generateThumbnails = useCallback((currentLayers: LayerData[]) => {
      const { width, height } = pageSizeRef.current;
      const thumbH = Math.round((120 * height) / width);
      const thumbs: Record<number, string> = {};

      for (const layer of currentLayers) {
        const lc = layerCanvasesRef.current.get(layer.id);
        const thumb = document.createElement("canvas");
        thumb.width = 120;
        thumb.height = thumbH;
        const tCtx = thumb.getContext("2d")!;
        if (lc) {
          tCtx.drawImage(lc, 0, 0, 120, thumbH);
        }
        thumbs[layer.id] = thumb.toDataURL("image/png", 0.6);
      }

      onLayerThumbnailUpdateRef.current?.(thumbs);
    }, []);

    // -----------------------------------------------------------------------
    // Layer canvas sync effect
    // Runs after every layers-prop change to:
    //   • Create canvases for newly added layers
    //   • Rebuild canvases when strokes decrease (undo)
    //   • Delete canvases for removed layers
    // -----------------------------------------------------------------------
    useEffect(() => {
      const dpr = getDpr();
      const { width, height } = pageSizeRef.current;
      const physW = Math.round(width * dpr);
      const physH = Math.round(height * dpr);

      const currentIds = new Set(layers.map((l) => l.id));

      // Remove canvases for deleted layers
      for (const id of [...layerCanvasesRef.current.keys()]) {
        if (!currentIds.has(id)) {
          layerCanvasesRef.current.delete(id);
          layerStrokeCountsRef.current.delete(id);
        }
      }

      for (const layer of layers) {
        const existing = layerCanvasesRef.current.get(layer.id);
        const prevCount = layerStrokeCountsRef.current.get(layer.id);
        const currCount = layer.strokes.length;

        if (!existing || existing.width !== physW || existing.height !== physH) {
          // New layer or page-size change: create canvas and rebuild
          const c = document.createElement("canvas");
          c.width = physW;
          c.height = physH;
          c.getContext("2d")!.scale(dpr, dpr);
          layerCanvasesRef.current.set(layer.id, c);
          if (currCount > 0) rebuildLayerCanvas(c, layer, dpr);
          layerStrokeCountsRef.current.set(layer.id, currCount);
        } else if (prevCount !== undefined && currCount < prevCount) {
          // Stroke removed (undo): rebuild from scratch
          rebuildLayerCanvas(existing, layer, dpr);
          layerStrokeCountsRef.current.set(layer.id, currCount);
        } else {
          // Stroke added (normal draw) or first sync: just update count
          layerStrokeCountsRef.current.set(layer.id, currCount);
        }
      }
    }, [layers, pageSize.width, pageSize.height]); // eslint-disable-line

    // After any layer change (visibility, opacity, strokes), re-composite
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    useEffect(() => {
      renderAllLayers();
    }, [layers, canvasBg, renderAllLayers]);

    // -----------------------------------------------------------------------
    // Main canvas initialisation
    // -----------------------------------------------------------------------

    const initMainCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = getDpr();
      const { width, height } = pageSizeRef.current;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      renderAllLayers();
    }, [renderAllLayers]);

    useEffect(() => {
      initMainCanvas();
    }, [initMainCanvas]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    useEffect(() => {
      initMainCanvas();
    }, [pageSize.width, pageSize.height, initMainCanvas]);

    // -----------------------------------------------------------------------
    // Imperative handle
    // -----------------------------------------------------------------------

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,

      clearCanvas: () => {
        const activeId = activeLayerIdRef.current;
        const lc = layerCanvasesRef.current.get(activeId);
        if (lc) {
          const dpr = getDpr();
          const lCtx = lc.getContext("2d")!;
          lCtx.save();
          lCtx.setTransform(1, 0, 0, 1, 0, 0);
          lCtx.clearRect(0, 0, lc.width, lc.height);
          lCtx.restore();
        }
        const newLayers = layersRef.current.map((l) =>
          l.id === activeId ? { ...l, strokes: [] } : l,
        );
        onLayersChangeRef.current(newLayers);
        layerStrokeCountsRef.current.set(activeId, 0);
        renderAllLayers();
      },

      undoStroke: () => {
        const activeId = activeLayerIdRef.current;
        const newLayers = layersRef.current.map((l) =>
          l.id === activeId ? { ...l, strokes: l.strokes.slice(0, -1) } : l,
        );
        onLayersChangeRef.current(newLayers);
        // The layer-sync useEffect will detect the count decrease and rebuild
      },

      importImage: (img: HTMLImageElement) => {
        const activeId = activeLayerIdRef.current;
        const lc = ensureLayerCanvas(activeId);
        const { width, height } = pageSizeRef.current;
        const lCtx = lc.getContext("2d")!;
        lCtx.drawImage(img, 0, 0, width, height);
        renderAllLayers();
      },
    }));

    // -----------------------------------------------------------------------
    // Input helpers
    // -----------------------------------------------------------------------

    const getPos = useCallback(
      (e: React.MouseEvent | React.TouchEvent): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if ("touches" in e) {
          const touch = e.touches[0];
          if (!touch) return null;
          return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }
        return {
          x: (e as React.MouseEvent).clientX - rect.left,
          y: (e as React.MouseEvent).clientY - rect.top,
        };
      },
      [],
    );

    // -----------------------------------------------------------------------
    // Tool: Fill (bucket)
    // -----------------------------------------------------------------------

    const handleFill = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPos(e);
        if (!pos) return;

        const activeId = activeLayerIdRef.current;
        const lc = ensureLayerCanvas(activeId);
        const lCtx = lc.getContext("2d")!;
        const dpr = getDpr();

        // Flood fill operates on physical pixels
        const physX = Math.round(pos.x * dpr);
        const physY = Math.round(pos.y * dpr);

        const imageData = lCtx.getImageData(0, 0, lc.width, lc.height);
        const fillColor = parseCssColor(brushColorRef.current);
        floodFill(imageData, physX, physY, fillColor, 30);

        // Apply fill to layer canvas
        lCtx.save();
        lCtx.setTransform(1, 0, 0, 1, 0, 0);
        lCtx.putImageData(imageData, 0, 0);
        lCtx.restore();

        // Store a copy of the post-fill ImageData for undo replay
        const fillImageData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height,
        );

        const fillStroke: Stroke = {
          points: [],
          color: brushColorRef.current,
          size: 1,
          isEraser: false,
          shape: "circle",
          opacity: 100,
          isFill: true,
          fillImageData,
        };

        const newLayers = layersRef.current.map((l) =>
          l.id === activeId
            ? { ...l, strokes: [...l.strokes, fillStroke] }
            : l,
        );

        // Update count BEFORE calling onLayersChange so the sync effect
        // doesn't misidentify this as an undo.
        layerStrokeCountsRef.current.set(
          activeId,
          (layerStrokeCountsRef.current.get(activeId) ?? 0) + 1,
        );

        onLayersChangeRef.current(newLayers);
        generateThumbnails(newLayers);
        renderAllLayers();
      },
      [getPos, ensureLayerCanvas, generateThumbnails, renderAllLayers],
    );

    // -----------------------------------------------------------------------
    // Tool: Brush / Eraser / Shape
    // -----------------------------------------------------------------------

    const canDraw =
      activeTool === "brush" ||
      activeTool === "eraser" ||
      activeTool === "shape";

    const startDrawing = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!canDraw) return;
        e.preventDefault();
        const pos = getPos(e);
        if (!pos) return;

        isDrawingRef.current = true;
        lastStampPosRef.current = pos;

        const isEraser = activeTool === "eraser";
        currentStrokeRef.current = {
          points: [pos],
          color: brushColorRef.current,
          size: brushSizeRef.current,
          isEraser,
          shape: brushShapeRef.current,
          opacity: brushOpacityRef.current,
        };

        // Draw the first point on the active layer canvas
        const activeId = activeLayerIdRef.current;
        const lc = ensureLayerCanvas(activeId);
        const lCtx = lc.getContext("2d")!;

        if (isEraser) {
          lCtx.save();
          lCtx.globalCompositeOperation = "destination-out";
          drawShape(lCtx, "circle", pos.x, pos.y, brushSizeRef.current, "#000000", brushOpacityRef.current);
          lCtx.restore();
        } else {
          drawShape(
            lCtx,
            brushShapeRef.current,
            pos.x,
            pos.y,
            brushSizeRef.current,
            brushColorRef.current,
            brushOpacityRef.current,
          );
        }

        renderAllLayers();
      },
      [canDraw, getPos, activeTool, ensureLayerCanvas, renderAllLayers],
    );

    const draw = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!canDraw) return;
        e.preventDefault();
        if (!isDrawingRef.current || !currentStrokeRef.current) return;

        const pos = getPos(e);
        if (!pos) return;

        currentStrokeRef.current.points.push(pos);
        const stroke = currentStrokeRef.current;

        const activeId = activeLayerIdRef.current;
        const lc = layerCanvasesRef.current.get(activeId);
        if (!lc) return;
        const lCtx = lc.getContext("2d")!;

        if (stroke.isEraser) {
          // Incremental eraser segment
          lCtx.save();
          lCtx.globalCompositeOperation = "destination-out";
          const pts = stroke.points;
          if (pts.length === 2) {
            lCtx.globalAlpha = stroke.opacity / 100;
            lCtx.beginPath();
            lCtx.lineWidth = stroke.size;
            lCtx.lineCap = "round";
            lCtx.lineJoin = "round";
            lCtx.strokeStyle = "#000000";
            lCtx.moveTo(pts[0].x, pts[0].y);
            lCtx.lineTo(pts[1].x, pts[1].y);
            lCtx.stroke();
            lCtx.globalAlpha = 1;
          } else if (pts.length > 2) {
            const i = pts.length - 2;
            const midX = (pts[i].x + pts[i + 1].x) / 2;
            const midY = (pts[i].y + pts[i + 1].y) / 2;
            const prevMidX = (pts[i - 1].x + pts[i].x) / 2;
            const prevMidY = (pts[i - 1].y + pts[i].y) / 2;
            lCtx.globalAlpha = stroke.opacity / 100;
            lCtx.beginPath();
            lCtx.lineWidth = stroke.size;
            lCtx.lineCap = "round";
            lCtx.lineJoin = "round";
            lCtx.strokeStyle = "#000000";
            lCtx.moveTo(prevMidX, prevMidY);
            lCtx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
            lCtx.stroke();
            lCtx.globalAlpha = 1;
          }
          lCtx.restore();
        } else if (stroke.shape === "circle") {
          // Incremental smooth brush stroke segment
          const pts = stroke.points;
          const savedAlpha = lCtx.globalAlpha;
          lCtx.globalAlpha = stroke.opacity / 100;
          lCtx.beginPath();
          lCtx.strokeStyle = stroke.color;
          lCtx.lineWidth = stroke.size;
          lCtx.lineCap = "round";
          lCtx.lineJoin = "round";
          if (pts.length === 2) {
            lCtx.moveTo(pts[0].x, pts[0].y);
            lCtx.lineTo(pts[1].x, pts[1].y);
          } else if (pts.length > 2) {
            const i = pts.length - 2;
            const midX = (pts[i].x + pts[i + 1].x) / 2;
            const midY = (pts[i].y + pts[i + 1].y) / 2;
            const prevMidX = (pts[i - 1].x + pts[i].x) / 2;
            const prevMidY = (pts[i - 1].y + pts[i].y) / 2;
            lCtx.moveTo(prevMidX, prevMidY);
            lCtx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
          }
          lCtx.stroke();
          lCtx.globalAlpha = savedAlpha;
        } else {
          // Shape-brush stamp with spacing
          const lastStamp = lastStampPosRef.current;
          if (lastStamp) {
            const dx = pos.x - lastStamp.x;
            const dy = pos.y - lastStamp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const spacing = Math.max(2, stroke.size * 0.4);
            if (dist >= spacing) {
              drawShape(
                lCtx,
                stroke.shape,
                pos.x,
                pos.y,
                stroke.size,
                stroke.color,
                stroke.opacity,
              );
              lastStampPosRef.current = pos;
            }
          }
        }

        renderAllLayers();
      },
      [getPos, canDraw, renderAllLayers],
    );

    const stopDrawing = useCallback(() => {
      if (!isDrawingRef.current || !currentStrokeRef.current) return;
      isDrawingRef.current = false;
      lastStampPosRef.current = null;

      const stroke = currentStrokeRef.current;
      currentStrokeRef.current = null;

      if (stroke.points.length === 0) return;

      const activeId = activeLayerIdRef.current;
      const newLayers = layersRef.current.map((l) =>
        l.id === activeId
          ? { ...l, strokes: [...l.strokes, stroke] }
          : l,
      );

      // Update count BEFORE calling onLayersChange to avoid spurious rebuild
      layerStrokeCountsRef.current.set(
        activeId,
        (layerStrokeCountsRef.current.get(activeId) ?? 0) + 1,
      );

      onLayersChangeRef.current(newLayers);
      generateThumbnails(newLayers);
    }, [generateThumbnails]);

    // -----------------------------------------------------------------------
    // Cursor
    // -----------------------------------------------------------------------

    const getCursor = () => {
      switch (activeTool) {
        case "eraser":
          return "cell";
        case "text":
          return "text";
        case "select":
          return "default";
        case "colorpicker":
          return "crosshair";
        case "fill":
          return "crosshair";
        case "pan":
          return "grab";
        default:
          return "crosshair";
      }
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
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
        onMouseDown={(e) => {
          if (activeTool === "fill") {
            handleFill(e);
          } else {
            startDrawing(e);
          }
        }}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => {
          if (activeTool === "fill") {
            handleFill(e);
          } else {
            startDrawing(e);
          }
        }}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        data-ocid="drawing.canvas_target"
      />
    );
  },
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
