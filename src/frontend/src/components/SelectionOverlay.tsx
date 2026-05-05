import { Clipboard, Copy, RotateCw, Scissors, Trash2, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawingCanvasHandle } from "./DrawingCanvas";

type SelectionState =
  | "idle"
  | "selecting"
  | "selected"
  | "moving"
  | "resizing"
  | "rotating"
  | "pasting"; // paste preview state

type SelectionMode = "new" | "add" | "subtract";
type HandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ClipboardEntry {
  data: ImageData;
  w: number;
  h: number;
}

interface SelectionOverlayProps {
  active: boolean;
  canvasRef: React.RefObject<DrawingCanvasHandle | null>;
  pageWidth: number;
  pageHeight: number;
  onSelectionChange?: (
    rect: { x: number; y: number; w: number; h: number } | null,
  ) => void;
  zoom?: number;
}

const HANDLE_SIZE = 10;
const HANDLE_HALF = HANDLE_SIZE / 2;
const ROTATE_OFFSET = 28;
const MAX_HISTORY = 50; // Match global undo history limit

// IMPORTANT: SelectionOverlay NEVER reinitializes layer canvases on selection.
// It only modifies canvas pixels during:
//   - Move: captures region pixels, clears region, puts back on drop
//   - Cut: clears region (destructive, intended)
//   - Delete: clears region (destructive, intended)
// New marquee selection ("selecting" state) does NOT clear any strokes.

function getHandles(rect: Rect): Record<HandleDir, { x: number; y: number }> {
  const { x, y, w, h } = rect;
  return {
    nw: { x, y },
    n: { x: x + w / 2, y },
    ne: { x: x + w, y },
    e: { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w: { x, y: y + h / 2 },
  };
}

function getRotateHandle(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y - ROTATE_OFFSET };
}

function hitHandle(mx: number, my: number, rect: Rect): HandleDir | null {
  const handles = getHandles(rect);
  for (const [dir, pos] of Object.entries(handles) as [
    HandleDir,
    { x: number; y: number },
  ][]) {
    if (
      mx >= pos.x - HANDLE_HALF - 4 &&
      mx <= pos.x + HANDLE_HALF + 4 &&
      my >= pos.y - HANDLE_HALF - 4 &&
      my <= pos.y + HANDLE_HALF + 4
    ) {
      return dir;
    }
  }
  return null;
}

function hitRotateHandle(mx: number, my: number, rect: Rect): boolean {
  const rh = getRotateHandle(rect);
  const r = HANDLE_HALF + 5;
  return Math.abs(mx - rh.x) <= r && Math.abs(my - rh.y) <= r;
}

function inRect(mx: number, my: number, rect: Rect): boolean {
  return (
    mx >= rect.x &&
    mx <= rect.x + rect.w &&
    my >= rect.y &&
    my <= rect.y + rect.h
  );
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeRect(rect: Rect): Rect {
  let { x, y, w, h } = rect;
  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }
  return { x, y, w, h };
}

function resizeRect(
  original: Rect,
  dir: HandleDir,
  dx: number,
  dy: number,
  shiftKey: boolean,
): Rect {
  let { x, y, w, h } = original;
  const origAspect = original.w / (original.h || 1);

  switch (dir) {
    case "nw":
      x += dx;
      y += dy;
      w -= dx;
      h -= dy;
      break;
    case "n":
      y += dy;
      h -= dy;
      break;
    case "ne":
      y += dy;
      w += dx;
      h -= dy;
      break;
    case "e":
      w += dx;
      break;
    case "se":
      w += dx;
      h += dy;
      break;
    case "s":
      h += dy;
      break;
    case "sw":
      x += dx;
      w -= dx;
      h += dy;
      break;
    case "w":
      x += dx;
      w -= dx;
      break;
  }

  if (
    shiftKey &&
    (dir === "nw" || dir === "ne" || dir === "se" || dir === "sw")
  ) {
    // Maintain aspect ratio from corner drag
    const newAspect = Math.abs(w) / (Math.abs(h) || 1);
    if (newAspect > origAspect) {
      const targetH = Math.abs(w) / origAspect;
      if (dir === "nw" || dir === "ne") {
        const diff = targetH - Math.abs(h);
        y -= diff;
        h = targetH * Math.sign(h || 1);
      } else {
        h = targetH * Math.sign(h || 1);
      }
    } else {
      const targetW = Math.abs(h) * origAspect;
      if (dir === "nw" || dir === "sw") {
        const diff = targetW - Math.abs(w);
        x -= diff;
        w = targetW * Math.sign(w || 1);
      } else {
        w = targetW * Math.sign(w || 1);
      }
    }
  }

  return { x, y, w, h };
}

function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x2 - x, h: y2 - y };
}

function subtractRect(a: Rect, b: Rect): Rect {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ox = Math.max(a.x, b.x);
  const oy = Math.max(a.y, b.y);
  const ox2 = Math.min(ax2, bx2);
  const oy2 = Math.min(ay2, by2);
  if (ox >= ox2 || oy >= oy2) return a;
  const leftW = ox - a.x;
  const rightW = ax2 - ox2;
  const topH = oy - a.y;
  const bottomH = ay2 - oy2;
  const max = Math.max(leftW, rightW, topH, bottomH);
  if (max <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  if (max === leftW) return { x: a.x, y: a.y, w: leftW, h: a.h };
  if (max === rightW) return { x: ox2, y: a.y, w: rightW, h: a.h };
  if (max === topH) return { x: a.x, y: a.y, w: a.w, h: topH };
  return { x: a.x, y: oy2, w: a.w, h: bottomH };
}

const CURSOR_MAP: Record<HandleDir, string> = {
  nw: "nw-resize",
  n: "n-resize",
  ne: "ne-resize",
  e: "e-resize",
  se: "se-resize",
  s: "s-resize",
  sw: "sw-resize",
  w: "w-resize",
};

export default function SelectionOverlay({
  active,
  canvasRef,
  pageWidth,
  pageHeight,
  onSelectionChange,
  zoom = 100,
}: SelectionOverlayProps) {
  const [selState, setSelState] = useState<SelectionState>("idle");
  const [selRect, setSelRect] = useState<Rect | null>(null);
  const [rotation, setRotation] = useState(0);
  const [cursor, setCursor] = useState("crosshair");
  const [selMode, setSelMode] = useState<SelectionMode>("new");

  // Preview for move / paste
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const selRectRef = useRef<Rect | null>(null);
  const stateRef = useRef<SelectionState>("idle");
  // Drag: store the mouse offset within the rect (not delta from start)
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const selRectAtDragRef = useRef<Rect | null>(null);
  const activeHandleRef = useRef<HandleDir | null>(null);
  const selModeRef = useRef<SelectionMode>("new");
  const rotationRef = useRef(0);
  const rotateStartAngleRef = useRef(0);
  const rotateStartRotRef = useRef(0);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Captured pixel data for move (cleared from canvas on drag start)
  const moveCaptureRef = useRef<ImageData | null>(null);
  // Clipboard
  const clipboardRef = useRef<ClipboardEntry | null>(null);
  // Per-operation pixel history for undo/redo within selection ops
  const historyRef = useRef<ImageData[]>([]);

  // Paste dragging
  const pasteRectRef = useRef<Rect | null>(null);
  const [pasteRect, setPasteRect] = useState<Rect | null>(null);
  const isPasteDraggingRef = useRef(false);

  // RAF refs
  const rafRef = useRef<number | null>(null);
  const pendingRectRef = useRef<Rect | null>(null);
  const pendingPreviewPosRef = useRef<{ x: number; y: number } | null>(null);

  // Keep refs in sync
  useEffect(() => {
    selRectRef.current = selRect;
  }, [selRect]);
  useEffect(() => {
    stateRef.current = selState;
  }, [selState]);
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);
  useEffect(() => {
    selModeRef.current = selMode;
  }, [selMode]);
  useEffect(() => {
    pasteRectRef.current = pasteRect;
  }, [pasteRect]);

  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    if (selRect && selRect.w > 5 && selRect.h > 5) {
      const nr = normalizeRect(selRect);
      onSelectionChangeRef.current?.(nr);
    } else {
      onSelectionChangeRef.current?.(null);
    }
  }, [selRect]);

  const getRelativePos = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const overlay = overlayRef.current;
      if (!overlay) return { x: 0, y: 0 };
      const rect = overlay.getBoundingClientRect();
      const zf = zoom / 100;
      return {
        x: (e.clientX - rect.left) / zf,
        y: (e.clientY - rect.top) / zf,
      };
    },
    [zoom],
  );

  // Capture current canvas state to local history
  const captureHistory = useCallback(() => {
    const snap = canvasRef.current?.snapshotCanvas?.();
    if (snap) {
      historyRef.current.push(snap);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    }
    // Also save to canvas-level history
    canvasRef.current?.saveHistory?.();
  }, [canvasRef]);

  const deselect = useCallback(() => {
    // If we have move capture pending, we need to put it back
    if (moveCaptureRef.current && selRectRef.current) {
      const nr = normalizeRect(selRectRef.current);
      canvasRef.current?.putImageData(moveCaptureRef.current, nr.x, nr.y);
      moveCaptureRef.current = null;
    }
    setSelState("idle");
    setSelRect(null);
    setRotation(0);
    dragOffsetRef.current = { x: 0, y: 0 };
    selRectAtDragRef.current = null;
    activeHandleRef.current = null;
    setCursor("crosshair");
    setPreviewDataUrl(null);
    setPasteRect(null);
    pasteRectRef.current = null;
    isPasteDraggingRef.current = false;
    moveCaptureRef.current = null;
  }, [canvasRef]);

  const deleteSelection = useCallback(() => {
    const nr = selRect ? normalizeRect(selRect) : null;
    if (!nr) return;
    captureHistory();
    canvasRef.current?.clearRegion(nr.x, nr.y, nr.w, nr.h);
    setSelState("idle");
    setSelRect(null);
    setPreviewDataUrl(null);
    moveCaptureRef.current = null;
  }, [selRect, canvasRef, captureHistory]);

  const copySelection = useCallback(() => {
    const nr = selRect ? normalizeRect(selRect) : null;
    if (!nr || nr.w < 2 || nr.h < 2) return;
    const data = canvasRef.current?.getImageData(nr.x, nr.y, nr.w, nr.h);
    if (data) {
      clipboardRef.current = { data, w: nr.w, h: nr.h };
    }
  }, [selRect, canvasRef]);

  const cutSelection = useCallback(() => {
    const nr = selRect ? normalizeRect(selRect) : null;
    if (!nr || nr.w < 2 || nr.h < 2) return;
    captureHistory();
    const data = canvasRef.current?.getImageData(nr.x, nr.y, nr.w, nr.h);
    if (data) {
      clipboardRef.current = { data, w: nr.w, h: nr.h };
      canvasRef.current?.clearRegion(nr.x, nr.y, nr.w, nr.h);
      setSelState("idle");
      setSelRect(null);
      moveCaptureRef.current = null;
    }
  }, [selRect, canvasRef, captureHistory]);

  const startPastePreview = useCallback(() => {
    const copied = clipboardRef.current;
    if (!copied) return;

    // Build preview image URL
    const dpr = window.devicePixelRatio || 1;
    const offscreen = document.createElement("canvas");
    offscreen.width = copied.data.width;
    offscreen.height = copied.data.height;
    const ctx2 = offscreen.getContext("2d");
    ctx2?.putImageData(copied.data, 0, 0);
    const dataUrl = offscreen.toDataURL();
    const cssW = copied.data.width / dpr;
    const cssH = copied.data.height / dpr;

    // Place in center of page
    const px = Math.round((pageWidth - cssW) / 2);
    const py = Math.round((pageHeight - cssH) / 2);

    const rect: Rect = { x: px, y: py, w: cssW, h: cssH };
    setPreviewDataUrl(dataUrl);
    setPreviewSize({ w: cssW, h: cssH });
    setPreviewPos({ x: px, y: py });
    setPasteRect(rect);
    pasteRectRef.current = rect;
    setSelState("pasting");
    stateRef.current = "pasting";
    setSelRect(null);
    moveCaptureRef.current = null;
  }, [pageWidth, pageHeight]);

  const confirmPaste = useCallback(() => {
    const copied = clipboardRef.current;
    const pr = pasteRectRef.current;
    if (!copied || !pr) return;
    captureHistory();
    canvasRef.current?.putImageData(copied.data, pr.x, pr.y);
    canvasRef.current?.bakeToFlatLayer?.();
    // Set selection to the pasted region
    setSelRect({ x: pr.x, y: pr.y, w: pr.w, h: pr.h });
    setSelState("selected");
    stateRef.current = "selected";
    setPreviewDataUrl(null);
    setPasteRect(null);
    pasteRectRef.current = null;
    isPasteDraggingRef.current = false;
  }, [canvasRef, captureHistory]);

  const cancelPaste = useCallback(() => {
    setPreviewDataUrl(null);
    setPasteRect(null);
    pasteRectRef.current = null;
    setSelState("idle");
    stateRef.current = "idle";
    isPasteDraggingRef.current = false;
  }, []);

  // Arrow key movement
  const moveByArrow = useCallback(
    (dx: number, dy: number) => {
      const nr = selRectRef.current ? normalizeRect(selRectRef.current) : null;
      if (!nr) return;
      const newX = clamp(nr.x + dx, 0, pageWidth - nr.w);
      const newY = clamp(nr.y + dy, 0, pageHeight - nr.h);
      const moved = { ...nr, x: newX, y: newY };
      setSelRect(moved);
    },
    [pageWidth, pageHeight],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!active) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (stateRef.current === "pasting") {
          cancelPaste();
          return;
        }
        deleteSelection();
        return;
      }
      if (ctrl && e.key === "c") {
        e.preventDefault();
        copySelection();
        return;
      }
      if (ctrl && e.key === "x") {
        e.preventDefault();
        cutSelection();
        return;
      }
      if (ctrl && e.key === "v") {
        e.preventDefault();
        startPastePreview();
        return;
      }
      if (ctrl && e.key === "z") {
        e.preventDefault();
        canvasRef.current?.undo?.();
        return;
      }
      if (ctrl && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        canvasRef.current?.redo?.();
        return;
      }
      if (ctrl && e.key === "d") {
        e.preventDefault();
        deselect();
        return;
      }
      if (e.key === "Escape") {
        if (stateRef.current === "pasting") {
          cancelPaste();
          return;
        }
        deselect();
        return;
      }
      if (e.key === "Enter" && stateRef.current === "pasting") {
        e.preventDefault();
        confirmPaste();
        return;
      }

      // Arrow keys
      if (stateRef.current === "selected" || stateRef.current === "moving") {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          moveByArrow(-step, 0);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          moveByArrow(step, 0);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          moveByArrow(0, -step);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          moveByArrow(0, step);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    active,
    deleteSelection,
    copySelection,
    cutSelection,
    startPastePreview,
    deselect,
    moveByArrow,
    confirmPaste,
    cancelPaste,
    canvasRef,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const pos = getRelativePos(e);
      const currentRect = selRectRef.current;
      const state = stateRef.current;

      // --- PASTE mode: drag preview or confirm/cancel ---
      if (state === "pasting") {
        const pr = pasteRectRef.current;
        if (pr && inRect(pos.x, pos.y, pr)) {
          // Start dragging paste preview
          isPasteDraggingRef.current = true;
          dragOffsetRef.current = { x: pos.x - pr.x, y: pos.y - pr.y };
        } else {
          // Click outside → confirm paste
          confirmPaste();
        }
        return;
      }

      // Determine selection mode
      let mode: SelectionMode = "new";
      if (e.shiftKey) mode = "add";
      else if (e.altKey) mode = "subtract";
      setSelMode(mode);
      selModeRef.current = mode;

      if (
        currentRect &&
        (state === "selected" || state === "moving" || state === "resizing")
      ) {
        const nr = normalizeRect(currentRect);

        // Rotation handle
        if (hitRotateHandle(pos.x, pos.y, nr)) {
          dragStartRef.current = pos;
          selRectAtDragRef.current = nr;
          const cx = nr.x + nr.w / 2;
          const cy = nr.y + nr.h / 2;
          rotateStartAngleRef.current = Math.atan2(pos.y - cy, pos.x - cx);
          rotateStartRotRef.current = rotationRef.current;
          setSelState("rotating");
          stateRef.current = "rotating";
          setCursor("grab");
          return;
        }

        // Resize handle
        const hitDir = hitHandle(pos.x, pos.y, nr);
        if (hitDir) {
          dragStartRef.current = pos;
          selRectAtDragRef.current = nr;
          activeHandleRef.current = hitDir;
          setSelState("resizing");
          stateRef.current = "resizing";
          return;
        }

        // Move: inside rect
        if (inRect(pos.x, pos.y, nr)) {
          // Capture pixel data from region and clear it
          captureHistory();
          const captured = canvasRef.current?.getImageData(
            nr.x,
            nr.y,
            nr.w,
            nr.h,
          );
          if (captured) {
            moveCaptureRef.current = captured;
            // Build preview
            const dpr = window.devicePixelRatio || 1;
            const offscreen = document.createElement("canvas");
            offscreen.width = captured.width;
            offscreen.height = captured.height;
            const ctx2 = offscreen.getContext("2d");
            ctx2?.putImageData(captured, 0, 0);
            setPreviewDataUrl(offscreen.toDataURL());
            const cssW = captured.width / dpr;
            const cssH = captured.height / dpr;
            setPreviewSize({ w: cssW, h: cssH });
            setPreviewPos({ x: nr.x, y: nr.y });
            // Clear original region from canvas
            canvasRef.current?.clearRegion(nr.x, nr.y, nr.w, nr.h);
          }
          // Store offset of cursor within rect
          dragOffsetRef.current = { x: pos.x - nr.x, y: pos.y - nr.y };
          selRectAtDragRef.current = nr;
          setSelState("moving");
          stateRef.current = "moving";
          setCursor("move");
          return;
        }

        // Click outside selection
        if (mode === "new") {
          // If we had a move in progress, put data back
          if (moveCaptureRef.current) {
            const nr2 = normalizeRect(
              selRectRef.current || selRectAtDragRef.current!,
            );
            canvasRef.current?.putImageData(
              moveCaptureRef.current,
              nr2.x,
              nr2.y,
            );
            moveCaptureRef.current = null;
          }
          deselect();
        }
      }

      // Start new selection (if not blocked)
      if (mode !== "new" || !currentRect || state === "idle") {
        setSelRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
        setSelState("selecting");
        stateRef.current = "selecting";
        dragStartRef.current = pos;
        setPreviewDataUrl(null);
        moveCaptureRef.current = null;
      }
    },
    [getRelativePos, canvasRef, deselect, captureHistory, confirmPaste],
  );

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingRectRef.current !== null) {
        setSelRect({ ...pendingRectRef.current });
        pendingRectRef.current = null;
      }
      if (pendingPreviewPosRef.current !== null) {
        setPreviewPos({ ...pendingPreviewPosRef.current });
        pendingPreviewPosRef.current = null;
      }
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const pos = getRelativePos(e);
      const state = stateRef.current;

      // --- PASTING drag ---
      if (state === "pasting" && isPasteDraggingRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const copied = clipboardRef.current;
        if (!copied) return;
        const cssW = copied.data.width / dpr;
        const cssH = copied.data.height / dpr;
        const newX = clamp(
          pos.x - dragOffsetRef.current.x,
          0,
          pageWidth - cssW,
        );
        const newY = clamp(
          pos.y - dragOffsetRef.current.y,
          0,
          pageHeight - cssH,
        );
        const newRect: Rect = { x: newX, y: newY, w: cssW, h: cssH };
        pasteRectRef.current = newRect;
        pendingPreviewPosRef.current = { x: newX, y: newY };
        setPasteRect(newRect);
        scheduleUpdate();
        return;
      }

      // --- SELECTING ---
      if (state === "selecting" && dragStartRef.current) {
        const start = dragStartRef.current;
        // Normalized bounding box (works in all drag directions)
        const newRect: Rect = {
          x: Math.min(start.x, pos.x),
          y: Math.min(start.y, pos.y),
          w: Math.abs(pos.x - start.x),
          h: Math.abs(pos.y - start.y),
        };
        pendingRectRef.current = newRect;
        scheduleUpdate();
        return;
      }

      // --- MOVING ---
      if (state === "moving" && selRectAtDragRef.current) {
        const base = selRectAtDragRef.current;
        // Use offset-based positioning (no jitter)
        const newX = clamp(
          pos.x - dragOffsetRef.current.x,
          0,
          pageWidth - base.w,
        );
        const newY = clamp(
          pos.y - dragOffsetRef.current.y,
          0,
          pageHeight - base.h,
        );
        const newRect: Rect = { ...base, x: newX, y: newY };
        pendingRectRef.current = newRect;
        pendingPreviewPosRef.current = { x: newX, y: newY };
        scheduleUpdate();
        return;
      }

      // --- RESIZING ---
      if (
        state === "resizing" &&
        dragStartRef.current &&
        selRectAtDragRef.current &&
        activeHandleRef.current
      ) {
        const dx = pos.x - dragStartRef.current.x;
        const dy = pos.y - dragStartRef.current.y;
        const newRect = resizeRect(
          selRectAtDragRef.current,
          activeHandleRef.current,
          dx,
          dy,
          e.shiftKey,
        );
        pendingRectRef.current = newRect;
        scheduleUpdate();
        return;
      }

      // --- ROTATING ---
      if (
        state === "rotating" &&
        dragStartRef.current &&
        selRectAtDragRef.current
      ) {
        const nr = selRectAtDragRef.current;
        const cx = nr.x + nr.w / 2;
        const cy = nr.y + nr.h / 2;
        const angle = Math.atan2(pos.y - cy, pos.x - cx);
        const delta = angle - rotateStartAngleRef.current;
        const newRot = rotateStartRotRef.current + (delta * 180) / Math.PI;
        setRotation(newRot);
        return;
      }

      // --- HOVER cursor updates ---
      const currentRect = selRectRef.current;
      if (currentRect && state === "selected") {
        const nr = normalizeRect(currentRect);
        if (hitRotateHandle(pos.x, pos.y, nr)) {
          setCursor("grab");
        } else {
          const hitDir = hitHandle(pos.x, pos.y, nr);
          if (hitDir) setCursor(CURSOR_MAP[hitDir]);
          else if (inRect(pos.x, pos.y, nr)) setCursor("move");
          else setCursor("crosshair");
        }
      } else if (state === "pasting") {
        const pr = pasteRectRef.current;
        if (pr && inRect(pos.x, pos.y, pr)) setCursor("move");
        else setCursor("crosshair");
      }
    },
    [getRelativePos, pageWidth, pageHeight, scheduleUpdate],
  );

  const handleMouseUp = useCallback(
    (_e: MouseEvent) => {
      const state = stateRef.current;
      const currentRect = selRectRef.current;

      // Paste drag end
      if (state === "pasting") {
        isPasteDraggingRef.current = false;
        return;
      }

      // Selecting done
      if (state === "selecting") {
        if (currentRect && currentRect.w > 5 && currentRect.h > 5) {
          const newNr = normalizeRect(currentRect);
          const prevRect = selRectRef.current;
          if (selModeRef.current === "add" && prevRect && prevRect.w > 0) {
            setSelRect(unionRect(normalizeRect(prevRect), newNr));
          } else if (
            selModeRef.current === "subtract" &&
            prevRect &&
            prevRect.w > 0
          ) {
            const result = subtractRect(normalizeRect(prevRect), newNr);
            if (result.w > 5 && result.h > 5) setSelRect(result);
            else {
              deselect();
              return;
            }
          } else {
            setSelRect(newNr);
          }
          setSelState("selected");
          stateRef.current = "selected";
        } else {
          deselect();
        }
        return;
      }

      // Moving done: paste the captured data at new position
      if (state === "moving" && moveCaptureRef.current) {
        const finalRectRaw = pendingRectRef.current ?? selRectRef.current;
        if (!finalRectRaw) {
          if (selRectAtDragRef.current) {
            canvasRef.current?.putImageData(
              moveCaptureRef.current,
              selRectAtDragRef.current.x,
              selRectAtDragRef.current.y,
            );
          }
          moveCaptureRef.current = null;
          setPreviewDataUrl(null);
          setSelState("idle");
          stateRef.current = "idle";
          return;
        }
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        pendingRectRef.current = null;
        pendingPreviewPosRef.current = null;
        const nr = normalizeRect(finalRectRaw);
        canvasRef.current?.putImageData(moveCaptureRef.current, nr.x, nr.y);
        canvasRef.current?.bakeToFlatLayer?.();
        moveCaptureRef.current = null;
        setSelRect(nr);
        setPreviewDataUrl(null);
        setPreviewPos({ x: nr.x, y: nr.y });
        setSelState("selected");
        stateRef.current = "selected";
        setCursor("move");
        return;
      }

      // Resizing done
      if (state === "resizing") {
        const nr = currentRect ? normalizeRect(currentRect) : null;
        if (nr && nr.w > 5 && nr.h > 5) {
          setSelRect(nr);
          setSelState("selected");
          stateRef.current = "selected";
        } else {
          deselect();
        }
        activeHandleRef.current = null;
        return;
      }

      // Rotating done
      if (state === "rotating") {
        setSelState("selected");
        stateRef.current = "selected";
        setCursor("crosshair");
        return;
      }
    },
    [canvasRef, deselect],
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [active, handleMouseMove, handleMouseUp]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!active) return null;

  const displayRect = selRect ? normalizeRect(selRect) : null;
  const hasSelection = displayRect && displayRect.w > 5 && displayRect.h > 5;
  const handles = displayRect ? getHandles(displayRect) : null;
  const rotateHandle = displayRect ? getRotateHandle(displayRect) : null;

  const toolbarTop = displayRect ? Math.max(4, displayRect.y - 56) : 0;
  const toolbarLeft = displayRect
    ? Math.max(
        4,
        Math.min(pageWidth - 310, displayRect.x + displayRect.w / 2 - 155),
      )
    : 0;

  const cx = displayRect ? displayRect.x + displayRect.w / 2 : 0;
  const cy = displayRect ? displayRect.y + displayRect.h / 2 : 0;

  return (
    <div
      ref={overlayRef}
      data-ocid="selection.canvas_target"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: pageWidth,
        height: pageHeight,
        cursor,
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Live move preview */}
      {previewDataUrl && selState === "moving" && (
        <img
          src={previewDataUrl}
          alt="drag preview"
          style={{
            position: "absolute",
            left: previewPos.x,
            top: previewPos.y,
            width: previewSize.w,
            height: previewSize.h,
            pointerEvents: "none",
            opacity: 0.88,
            border: "1.5px dashed rgba(0,140,255,0.8)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
            zIndex: 50,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${previewSize.w / 2}px ${previewSize.h / 2}px`,
            willChange: "transform, left, top",
          }}
        />
      )}

      {/* Paste preview */}
      {previewDataUrl && selState === "pasting" && pasteRect && (
        <>
          <img
            src={previewDataUrl}
            alt="paste preview"
            style={{
              position: "absolute",
              left: previewPos.x,
              top: previewPos.y,
              width: previewSize.w,
              height: previewSize.h,
              pointerEvents: "none",
              opacity: 0.9,
              border: "2px dashed rgba(80,200,120,0.9)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              zIndex: 60,
              cursor: "move",
              willChange: "left, top",
            }}
          />
          {/* Paste confirm/cancel toolbar */}
          <div
            style={{
              position: "absolute",
              top: Math.max(4, previewPos.y - 48),
              left: Math.max(
                4,
                Math.min(
                  pageWidth - 240,
                  previewPos.x + previewSize.w / 2 - 120,
                ),
              ),
              background: "rgba(18,18,28,0.97)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(80,200,120,0.4)",
              borderRadius: 10,
              display: "flex",
              gap: 2,
              padding: "4px 8px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              zIndex: 110,
              pointerEvents: "all",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "rgba(80,200,120,0.9)",
                fontWeight: 700,
                paddingRight: 6,
                borderRight: "1px solid rgba(255,255,255,0.1)",
                marginRight: 4,
              }}
            >
              PASTE
            </span>
            <ToolbarButton
              icon={<Clipboard size={13} />}
              label="Place (Enter)"
              ocid="selection.paste_confirm"
              onClick={(e) => {
                e.stopPropagation();
                confirmPaste();
              }}
            />
            <ToolbarButton
              icon={<X size={13} />}
              label="Cancel (Esc)"
              ocid="selection.paste_cancel"
              onClick={(e) => {
                e.stopPropagation();
                cancelPaste();
              }}
              danger
            />
          </div>
        </>
      )}

      {/* SVG overlay */}
      <svg
        role="img"
        aria-label="Selection overlay"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: pageWidth,
          height: pageHeight,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <defs>
          <style>{`
            @keyframes marchingAnts {
              from { stroke-dashoffset: 0; }
              to { stroke-dashoffset: -36; }
            }
            .marching-ants {
              animation: marchingAnts 0.55s linear infinite;
            }
          `}</style>
        </defs>

        {/* Dim outside selection */}
        {hasSelection && displayRect && selState !== "pasting" && (
          <path
            d={`M 0 0 L ${pageWidth} 0 L ${pageWidth} ${pageHeight} L 0 ${pageHeight} Z M ${displayRect.x} ${displayRect.y} L ${displayRect.x + displayRect.w} ${displayRect.y} L ${displayRect.x + displayRect.w} ${displayRect.y + displayRect.h} L ${displayRect.x} ${displayRect.y + displayRect.h} Z`}
            fill="rgba(0,0,0,0.22)"
            fillRule="evenodd"
          />
        )}

        {/* Selection group with rotation */}
        {displayRect && selState !== "pasting" && (
          <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
            {/* White base border */}
            <rect
              x={displayRect.x}
              y={displayRect.y}
              width={displayRect.w}
              height={displayRect.h}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={2}
            />
            {/* Marching ants */}
            <rect
              className="marching-ants"
              x={displayRect.x}
              y={displayRect.y}
              width={displayRect.w}
              height={displayRect.h}
              fill="none"
              stroke="rgba(40,130,255,0.95)"
              strokeWidth={1.5}
              strokeDasharray="8 4"
            />

            {/* Resize handles */}
            {hasSelection &&
              handles &&
              Object.entries(handles).map(([dir, pos]) => (
                <rect
                  key={dir}
                  x={pos.x - HANDLE_HALF}
                  y={pos.y - HANDLE_HALF}
                  width={HANDLE_SIZE}
                  height={HANDLE_SIZE}
                  fill="white"
                  stroke="rgba(0,90,220,0.9)"
                  strokeWidth={1.5}
                  rx={2}
                  style={{
                    pointerEvents: "all",
                    cursor: CURSOR_MAP[dir as HandleDir],
                  }}
                />
              ))}

            {/* Rotation handle */}
            {hasSelection && rotateHandle && (
              <>
                <line
                  x1={displayRect.x + displayRect.w / 2}
                  y1={displayRect.y}
                  x2={rotateHandle.x}
                  y2={rotateHandle.y}
                  stroke="rgba(0,180,255,0.7)"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
                <circle
                  cx={rotateHandle.x}
                  cy={rotateHandle.y}
                  r={6}
                  fill="white"
                  stroke="rgba(0,150,255,0.9)"
                  strokeWidth={1.5}
                  style={{ pointerEvents: "all", cursor: "grab" }}
                />
                {rotation !== 0 && (
                  <text
                    x={rotateHandle.x + 10}
                    y={rotateHandle.y}
                    fontSize={10}
                    fill="rgba(0,200,255,0.9)"
                    dominantBaseline="middle"
                    style={{ pointerEvents: "none" }}
                  >
                    {Math.round(rotation)}°
                  </text>
                )}
              </>
            )}
          </g>
        )}
      </svg>

      {/* Move indicator — shows when hovering inside a selection */}
      {hasSelection &&
        displayRect &&
        selState === "selected" &&
        cursor === "move" && (
          <div
            data-ocid="selection.move_hint"
            style={{
              position: "absolute",
              left: displayRect.x + displayRect.w / 2,
              top: displayRect.y + displayRect.h / 2,
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.62)",
              border: "1px solid rgba(0,140,255,0.5)",
              borderRadius: 6,
              padding: "3px 9px",
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(0,180,255,0.95)",
              pointerEvents: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              zIndex: 55,
              backdropFilter: "blur(4px)",
              whiteSpace: "nowrap",
            }}
          >
            Drag to Move
          </div>
        )}

      {/* Floating toolbar */}
      {hasSelection &&
        displayRect &&
        (selState === "selected" || selState === "moving") && (
          <div
            data-ocid="selection.panel"
            style={{
              position: "absolute",
              top: toolbarTop,
              left: toolbarLeft,
              background: "rgba(18,18,28,0.97)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 10,
              display: "flex",
              flexDirection: "row",
              gap: 2,
              padding: "4px 6px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              zIndex: 100,
              pointerEvents: "all",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(160,160,180,0.7)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                padding: "0 6px",
                borderRight: "1px solid rgba(255,255,255,0.1)",
                marginRight: 2,
              }}
            >
              SEL
            </span>
            <ToolbarButton
              icon={<Copy size={13} />}
              label="Copy (Ctrl+C)"
              ocid="selection.copy.button"
              onClick={(e) => {
                e.stopPropagation();
                copySelection();
              }}
            />
            <ToolbarButton
              icon={<Scissors size={13} />}
              label="Cut (Ctrl+X)"
              ocid="selection.cut.button"
              onClick={(e) => {
                e.stopPropagation();
                cutSelection();
              }}
            />
            <ToolbarButton
              icon={<Clipboard size={13} />}
              label="Paste (Ctrl+V)"
              ocid="selection.paste_btn"
              onClick={(e) => {
                e.stopPropagation();
                startPastePreview();
              }}
            />
            <ToolbarButton
              icon={<RotateCw size={13} />}
              label="Transform (resize/rotate/move)"
              ocid="selection.transform.button"
              onClick={(e) => {
                e.stopPropagation();
                // Transform is always active when selection is shown — just show a visual hint
                setSelState("selected");
              }}
              active={
                stateRef.current === "selected" ||
                stateRef.current === "resizing" ||
                stateRef.current === "rotating"
              }
            />
            <ToolbarButton
              icon={<Trash2 size={13} />}
              label="Delete"
              ocid="selection.delete_button"
              onClick={(e) => {
                e.stopPropagation();
                deleteSelection();
              }}
              danger
            />
            <ToolbarButton
              icon={<X size={13} />}
              label="Deselect (Ctrl+D)"
              ocid="selection.cancel_button"
              onClick={(e) => {
                e.stopPropagation();
                deselect();
              }}
            />
          </div>
        )}

      {/* Size indicator */}
      {hasSelection && displayRect && selState === "selecting" && (
        <div
          style={{
            position: "absolute",
            left: displayRect.x + displayRect.w + 6,
            top: displayRect.y + displayRect.h + 6,
            background: "rgba(0,0,0,0.75)",
            color: "white",
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 4,
            pointerEvents: "none",
            fontFamily: "monospace",
            zIndex: 100,
          }}
        >
          {Math.round(displayRect.w)} × {Math.round(displayRect.h)}
        </div>
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  ocid: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  active?: boolean;
}

function ToolbarButton({
  icon,
  label,
  ocid,
  onClick,
  danger,
  active,
}: ToolbarButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      data-ocid={ocid}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active
          ? "rgba(0,140,255,0.2)"
          : hovered
            ? danger
              ? "rgba(220,50,50,0.3)"
              : "rgba(255,255,255,0.12)"
            : danger
              ? "rgba(220,50,50,0.12)"
              : "transparent",
        border: `1px solid ${active ? "rgba(0,140,255,0.5)" : hovered ? (danger ? "rgba(220,50,50,0.5)" : "rgba(255,255,255,0.2)") : "transparent"}`,
        borderRadius: 999,
        padding: "4px 9px",
        cursor: "pointer",
        color: active
          ? "rgba(80,180,255,0.95)"
          : danger
            ? "rgba(255,100,100,0.9)"
            : "rgba(220,220,240,0.9)",
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 500,
        transition: "all 0.12s ease",
        whiteSpace: "nowrap",
        transform: hovered ? "scale(1.05)" : "scale(1)",
      }}
    >
      {icon}
      <span>{label.split(" (")[0].split(" (")[0]}</span>
    </button>
  );
}
