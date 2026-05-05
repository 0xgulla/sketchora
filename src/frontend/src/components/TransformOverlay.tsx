/**
 * TransformOverlay.tsx
 *
 * Supports TWO modes:
 *
 * 1. Legacy raster mode (vectorTransformActive = false / undefined):
 *    Mounts the TransformTool class onto a canvas overlay.
 *    Pointer events enabled, VTT overlay hidden.
 *
 * 2. Vector mode (vectorTransformActive = true):
 *    VectorTransformTool manages its own canvas rendering (via vttRef).
 *    Raster overlay canvas gets pointerEvents: none so it doesn't block VTT.
 *
 * Additionally exposes a MarqueeSelectionOverlay drawn with a dashed rect
 * when `marqueeRect` is provided (used during drag-select before activation).
 */

import { useEffect, useRef } from "react";
import { TransformTool } from "../lib/TransformTool";
import type {
  SiblingBounds,
  TransformState,
  VectorTransformTool,
} from "../lib/TransformTool";

// ─── MarqueeRect ───────────────────────────────────────────────────────────────

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

type PartialTransformState = Partial<
  Omit<TransformState, "originalImageData" | "layerIds" | "originalData">
>;

interface TransformOverlayProps {
  transformState: TransformState | null;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  siblingBounds?: SiblingBounds[];
  onTransformChange: (state: PartialTransformState) => void;
  onConfirm: (state: TransformState) => void;
  onCancel: () => void;

  // ── Vector mode ──────────────────────────────────────────────────────────────
  /** When true, VTT owns canvas interactions; raster overlay is transparent. */
  vectorTransformActive?: boolean;
  /** Ref to the mounted VectorTransformTool instance (managed by parent). */
  vttRef?: React.MutableRefObject<VectorTransformTool | null>;

  // ── Marquee selection ────────────────────────────────────────────────────────
  /** When provided, draw a dashed selection rectangle overlay (drag-select). */
  marqueeRect?: MarqueeRect | null;
}

// ─── MarqueeOverlay ────────────────────────────────────────────────────────────

function MarqueeOverlay({
  rect,
  canvasWidth,
  canvasHeight,
}: {
  rect: MarqueeRect;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Semi-transparent fill
    ctx.fillStyle = "rgba(100, 160, 255, 0.07)";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    // Dashed border
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(100, 160, 255, 0.85)";
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);

    // Corner dots
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(100, 160, 255, 0.9)";
    const corners = [
      [rect.x, rect.y],
      [rect.x + rect.width, rect.y],
      [rect.x, rect.y + rect.height],
      [rect.x + rect.width, rect.y + rect.height],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [rect, canvasWidth, canvasHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        touchAction: "none",
        zIndex: 9,
        background: "transparent",
      }}
    />
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TransformOverlay({
  transformState,
  canvasWidth,
  canvasHeight,
  zoom,
  siblingBounds = [],
  onTransformChange,
  onConfirm,
  onCancel,
  vectorTransformActive = false,
  vttRef,
  marqueeRect,
}: TransformOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolRef = useRef<TransformTool | null>(null);

  // Stable refs — prevents mount/unmount effect re-runs on prop changes
  const onTransformChangeRef =
    useRef<(s: PartialTransformState) => void>(onTransformChange);
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  const canvasWidthRef = useRef(canvasWidth);
  const canvasHeightRef = useRef(canvasHeight);
  const zoomRef = useRef(zoom);
  const siblingBoundsRef = useRef(siblingBounds);
  const vectorTransformActiveRef = useRef(vectorTransformActive);

  useEffect(() => {
    onTransformChangeRef.current = onTransformChange;
  }, [onTransformChange]);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);
  useEffect(() => {
    canvasWidthRef.current = canvasWidth;
  }, [canvasWidth]);
  useEffect(() => {
    canvasHeightRef.current = canvasHeight;
  }, [canvasHeight]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    siblingBoundsRef.current = siblingBounds;
  }, [siblingBounds]);
  useEffect(() => {
    vectorTransformActiveRef.current = vectorTransformActive;
  }, [vectorTransformActive]);

  // Propagate live option changes to the legacy tool
  useEffect(() => {
    if (!toolRef.current) return;
    toolRef.current.setOptions({
      onTransform: (state) =>
        onTransformChangeRef.current(state as PartialTransformState),
      onConfirm: (state) => onConfirmRef.current(state),
      onCancel: () => onCancelRef.current(),
      canvasWidth,
      canvasHeight,
      zoom,
      siblingBounds,
    });
  }, [canvasWidth, canvasHeight, zoom, siblingBounds]);

  // Mount legacy TransformTool once (never re-mount)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tool = new TransformTool(canvas, {
      onTransform: (state) =>
        onTransformChangeRef.current(state as PartialTransformState),
      onConfirm: (state) => onConfirmRef.current(state),
      onCancel: () => onCancelRef.current(),
      canvasWidth: canvasWidthRef.current,
      canvasHeight: canvasHeightRef.current,
      zoom: zoomRef.current,
      siblingBounds: siblingBoundsRef.current,
    });
    toolRef.current = tool;

    return () => {
      tool.destroy();
      toolRef.current = null;
    };
  }, []); // empty — mount once

  // Push legacy state changes into the tool only in raster mode
  useEffect(() => {
    if (!toolRef.current) return;
    toolRef.current.setState(transformState);
  }, [transformState]);

  // When VTT becomes active, attach it to the SAME canvas element so it can
  // render handles on the overlay canvas already in the DOM.
  useEffect(() => {
    if (!vttRef) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (vectorTransformActive && vttRef.current) {
      // Let VTT know about the overlay canvas for handle rendering (if supported)
      type MaybeAttach = {
        attachOverlayCanvas?: (c: HTMLCanvasElement) => void;
      };
      const vtt = vttRef.current as unknown as MaybeAttach;
      if (typeof vtt.attachOverlayCanvas === "function") {
        vtt.attachOverlayCanvas(canvas);
      }
    }
  }, [vectorTransformActive, vttRef]);

  const isLegacyActive = !vectorTransformActive && transformState !== null;

  return (
    <>
      {/* Raster transform overlay — disabled (pointer-events: none) in vector mode */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        data-ocid="transform_overlay.canvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          // In vector mode the raster canvas must NOT capture pointer events —
          // VTT manages its own canvas. In legacy mode, active only when state set.
          pointerEvents: vectorTransformActive
            ? "none"
            : isLegacyActive
              ? "all"
              : "none",
          touchAction: "none",
          zIndex: 10,
          background: "transparent",
          // Visually hide in vector mode — VTT draws on a separate canvas
          opacity: vectorTransformActive ? 0 : 1,
        }}
      />

      {/* Marquee selection overlay — shown during drag-select (both modes) */}
      {marqueeRect &&
        Math.abs(marqueeRect.width) > 2 &&
        Math.abs(marqueeRect.height) > 2 && (
          <MarqueeOverlay
            rect={marqueeRect}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        )}
    </>
  );
}
