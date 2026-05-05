import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TransformState,
  VectorTransformState,
} from "../lib/TransformTool";

// Re-export so existing importers keep working
export type { TransformState };

// ─── Types ─────────────────────────────────────────────────────────────────────

type PartialTransform = Partial<
  Omit<
    TransformState,
    "originalImageData" | "layerId" | "originalData" | "layerIds"
  >
>;

type PartialVectorTransform = Partial<VectorTransformState>;

interface TransformToolPanelProps {
  // ── Legacy mode ───────────────────────────────────────────────────────────────
  transformState?: TransformState | null;
  onTransformChange?: (partial: PartialTransform) => void;
  onConfirm?: () => void;
  onCancel?: () => void;

  // ── Vector mode ───────────────────────────────────────────────────────────────
  /** When provided, panel displays VectorTransformState values */
  vectorTransformState?: VectorTransformState | null;
  onVectorStateChange?: (patch: PartialVectorTransform) => void;
  onVectorConfirm?: () => void;
  onVectorCancel?: () => void;

  // ── Shared ────────────────────────────────────────────────────────────────────
  isVisible?: boolean;
  onFlipH?: () => void;
  onFlipV?: () => void;
  onReset?: () => void;
  /** Called when user clicks Reset Pivot button — sets pivotLocked=true and recenters */
  onResetPivot?: () => void;
  accentColor?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PANEL_W = 280;

// ─── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle = {
  fontSize: 9,
  fontWeight: 600 as const,
  color: "rgba(107,107,112,0.9)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
};

const border = "rgba(255,255,255,0.1)";

// ─── Sub-components ────────────────────────────────────────────────────────────

function NumInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  ocid,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  ocid: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {label && <span style={labelStyle}>{label}</span>}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${border}`,
          borderRadius: 7,
          overflow: "hidden",
        }}
      >
        <input
          type="number"
          value={Math.round(value * 10) / 10}
          min={min}
          max={max}
          step={step}
          data-ocid={ocid}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "#e8e8ec",
            fontSize: 12,
            padding: "5px 7px",
            outline: "none",
            fontFamily: "inherit",
            fontVariantNumeric: "tabular-nums",
            minWidth: 0,
          }}
        />
        {unit && (
          <span
            style={{
              fontSize: 10,
              color: "rgba(161,161,170,0.5)",
              paddingRight: 7,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  ocid,
  accentColor,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ocid: string;
  accentColor: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={labelStyle}>{label}</span>
        <span
          style={{
            fontSize: 11,
            color: "rgba(161,161,170,0.8)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(value * 10) / 10}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-ocid={ocid}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor, width: "100%", cursor: "pointer" }}
      />
    </div>
  );
}

function ActionBtn({
  label,
  ocid,
  accent,
  onClick,
}: {
  label: string;
  ocid: string;
  accent?: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: "7px 0",
        borderRadius: 9,
        border: `1px solid ${hovered && accent ? `${accent}55` : border}`,
        background:
          hovered && accent ? `${accent}18` : "rgba(255,255,255,0.04)",
        color: hovered && accent ? accent : "#a1a1aa",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      {label}
    </button>
  );
}

// ─── AI Suggestion pill ─────────────────────────────────────────────────────────

interface Suggestion {
  label: string;
  icon: string;
  action: () => void;
}

function SuggestionPill({ s, accent }: { s: Suggestion; accent: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={s.action}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        border: `1px solid ${hovered ? `${accent}60` : `${accent}30`}`,
        background: hovered ? `${accent}20` : `${accent}10`,
        color: hovered ? accent : "rgba(161,161,170,0.8)",
        fontSize: 10,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.14s",
        whiteSpace: "nowrap",
      }}
    >
      <span>{s.icon}</span>
      <span>{s.label}</span>
    </button>
  );
}

// ─── Vector mode status badge ───────────────────────────────────────────────────

function VectorStatusBadge() {
  return (
    <div
      data-ocid="transform_panel.vector_status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.25)",
        borderRadius: 8,
        marginBottom: 2,
      }}
    >
      <span style={{ fontSize: 10 }}>✦</span>
      <span
        style={{
          fontSize: 10,
          color: "#4ade80",
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        Vector transform active — stroke quality preserved
      </span>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────────

export default function TransformToolPanel({
  transformState,
  onTransformChange,
  onConfirm,
  onCancel,
  vectorTransformState,
  onVectorStateChange,
  onVectorConfirm,
  onVectorCancel,
  isVisible = true,
  onFlipH,
  onFlipV,
  onReset,
  onResetPivot,
  accentColor = "oklch(0.72 0.15 200)",
  canvasWidth = 1024,
  canvasHeight = 1024,
}: TransformToolPanelProps) {
  // ── Determine active mode ────────────────────────────────────────────────────
  const isVectorMode = Boolean(vectorTransformState);

  // Unified state view — either VectorTransformState fields or legacy TransformState fields
  const ts = isVectorMode
    ? (vectorTransformState ?? null)
    : (transformState ?? null);

  // Unified change dispatcher
  const dispatchChange = useCallback(
    (patch: PartialTransform & PartialVectorTransform) => {
      if (isVectorMode && onVectorStateChange) {
        onVectorStateChange(patch as PartialVectorTransform);
      } else if (!isVectorMode && onTransformChange) {
        onTransformChange(patch as PartialTransform);
      }
    },
    [isVectorMode, onVectorStateChange, onTransformChange],
  );

  // Unified confirm / cancel
  const handleConfirm = useCallback(() => {
    if (isVectorMode && onVectorConfirm) {
      onVectorConfirm();
    } else if (!isVectorMode && onConfirm) {
      onConfirm();
    }
  }, [isVectorMode, onVectorConfirm, onConfirm]);

  const handleCancel = useCallback(() => {
    if (isVectorMode && onVectorCancel) {
      onVectorCancel();
    } else if (!isVectorMode && onCancel) {
      onCancel();
    }
  }, [isVectorMode, onVectorCancel, onCancel]);

  // ── Panel drag ───────────────────────────────────────────────────────────────
  const defaultLeft =
    typeof window !== "undefined" ? window.innerWidth - PANEL_W - 16 : 800;
  const [pos, setPos] = useState({ x: defaultLeft, y: 80 });
  const [showAI, setShowAI] = useState(true);
  const [showSkew, setShowSkew] = useState(false);
  const origRef = useRef({ w: 0, h: 0, x: 0, y: 0 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const aspectRef = useRef(1);

  useEffect(() => {
    if (ts && ts.height > 0) {
      aspectRef.current = ts.width / ts.height;
    }
  }, [ts]);

  const clampPos = useCallback((x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ph = panelRef.current?.offsetHeight ?? 420;
    return {
      x: Math.min(Math.max(0, x), vw - PANEL_W),
      y: Math.min(Math.max(0, y), vh - ph),
    };
  }, []);

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos(
        clampPos(
          e.clientX - dragOffset.current.x,
          e.clientY - dragOffset.current.y,
        ),
      );
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [clampPos]);

  // Keyboard shortcuts — always route to the correct mode handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT") return;
      if (!isVisible) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
      if ((e.key === "h" || e.key === "H") && onFlipH) onFlipH();
      if ((e.key === "v" || e.key === "V") && onFlipV) onFlipV();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, handleConfirm, handleCancel, onFlipH, onFlipV]);

  // ── AI Suggestions ────────────────────────────────────────────────────────────
  const suggestions: Suggestion[] = ts
    ? [
        {
          label: "Center",
          icon: "⊕",
          action: () =>
            dispatchChange({
              x: canvasWidth / 2 - ts.width / 2,
              y: canvasHeight / 2 - ts.height / 2,
            }),
        },
        {
          label: "Straighten",
          icon: "⟲",
          action: () => {
            const snapped = [0, 90, 180, -90].reduce(
              (best, target) =>
                Math.abs(ts.angle - target) < Math.abs(ts.angle - best)
                  ? target
                  : best,
              0,
            );
            dispatchChange({ angle: snapped });
          },
        },
        {
          label: "Fill Canvas",
          icon: "⤢",
          action: () => {
            const scale = Math.min(
              canvasWidth / ts.width,
              canvasHeight / ts.height,
            );
            const newW = ts.width * scale;
            const newH = ts.height * scale;
            dispatchChange({
              x: (canvasWidth - newW) / 2,
              y: (canvasHeight - newH) / 2,
              width: newW,
              height: newH,
            });
          },
        },
        {
          label: "Align Grid",
          icon: "⊞",
          action: () =>
            dispatchChange({
              x: Math.round(ts.x / 10) * 10,
              y: Math.round(ts.y / 10) * 10,
            }),
        },
      ]
    : [];

  const panelBg = "rgba(14,12,22,0.97)";
  const sectionDivider = {
    borderTop: `1px solid ${border}`,
    paddingTop: 12,
    marginTop: 2,
  };

  if (!ts || !isVisible) return null;

  // Capture originals on first render for scale % computation
  if (origRef.current.w === 0 && ts.width > 0) {
    origRef.current = { w: ts.width, h: ts.height, x: ts.x, y: ts.y };
  }
  const origW = origRef.current.w || ts.width;
  const origH = origRef.current.h || ts.height;
  const scalePercent = Math.round((ts.width / origW) * 100);

  // Read fields that exist on both state shapes
  const lockAspect =
    ts.aspectLocked ??
    ("maintainAspectRatio" in ts ? ts.maintainAspectRatio : false) ??
    false;
  const snapEnabled = ts.snapEnabled ?? false;
  const gridSize = ts.gridSize ?? 10;
  const skewX = ts.skewX ?? 0;
  const skewY = ts.skewY ?? 0;

  // Multi-layer count only relevant in legacy mode
  const multiLayerCount =
    !isVectorMode && "layerIds" in ts
      ? ((ts as TransformState).layerIds?.length ??
        (ts as TransformState).selectedLayerIds?.length ??
        1)
      : 1;

  return (
    <div
      ref={panelRef}
      data-ocid="transform_panel.panel"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: PANEL_W,
        background: panelBg,
        border: `1px solid ${border}`,
        borderRadius: 18,
        zIndex: 200,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)",
        animation: "float-in 0.22s ease-out",
        userSelect: "none",
        backdropFilter: "blur(18px)",
        maxHeight: "calc(100vh - 80px)",
        overflowY: "auto",
      }}
    >
      {/* ── Header ── */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 13px",
          borderBottom: `1px solid ${border}`,
          cursor: "grab",
          background: "rgba(255,255,255,0.025)",
          position: "sticky",
          top: 0,
          zIndex: 1,
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke={accentColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="12" height="12" rx="1" />
            <path d="M16 4h4v4" />
            <path d="M20 4l-4 4" />
            <path d="M4 16v4h4" />
            <path d="M4 20l4-4" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#e8e8ec" }}>
            Transform
          </span>
          {multiLayerCount > 1 && (
            <span
              style={{
                fontSize: 9,
                background: `${accentColor}25`,
                color: accentColor,
                border: `1px solid ${accentColor}40`,
                borderRadius: 10,
                padding: "1px 6px",
              }}
            >
              {multiLayerCount} layers
            </span>
          )}
          {isVectorMode && (
            <span
              style={{
                fontSize: 9,
                background: "rgba(34,197,94,0.15)",
                color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 10,
                padding: "1px 6px",
                fontWeight: 700,
              }}
            >
              VECTOR
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={handleConfirm}
            data-ocid="transform_panel.confirm.button"
            title="Confirm (Enter)"
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              border: "1px solid rgba(34,197,94,0.4)",
              background: "rgba(34,197,94,0.12)",
              color: "#22c55e",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={handleCancel}
            data-ocid="transform_panel.cancel.button"
            title="Cancel (Esc)"
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
              color: "rgba(239,68,68,0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              transition: "all 0.15s",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          padding: "14px 14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Vector status badge — shown only in vector mode */}
        {isVectorMode && <VectorStatusBadge />}

        {/* Position */}
        <div>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Position</div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <NumInput
              label="X"
              value={ts.x}
              unit="px"
              ocid="transform_panel.x.input"
              onChange={(v) => dispatchChange({ x: v })}
            />
            <NumInput
              label="Y"
              value={ts.y}
              unit="px"
              ocid="transform_panel.y.input"
              onChange={(v) => dispatchChange({ y: v })}
            />
          </div>
        </div>

        {/* Size */}
        <div style={sectionDivider}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={labelStyle}>Size</span>
            <button
              type="button"
              onClick={() =>
                dispatchChange({
                  aspectLocked: !lockAspect,
                  maintainAspectRatio: !lockAspect,
                })
              }
              data-ocid="transform_panel.lock_aspect.toggle"
              title={lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: lockAspect
                  ? `${accentColor}22`
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${lockAspect ? `${accentColor}55` : border}`,
                borderRadius: 6,
                padding: "2px 8px",
                cursor: "pointer",
                color: lockAspect ? accentColor : "rgba(161,161,170,0.6)",
                fontSize: 9,
                letterSpacing: "0.05em",
                transition: "all 0.14s",
              }}
            >
              {lockAspect ? "🔒" : "🔓"} LOCK
            </button>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <NumInput
              label="W"
              value={ts.width}
              min={1}
              unit="px"
              ocid="transform_panel.width.input"
              onChange={(v) => {
                if (lockAspect && ts.height > 0) {
                  dispatchChange({
                    width: v,
                    height: Math.round(v / aspectRef.current),
                  });
                } else {
                  dispatchChange({ width: v });
                }
              }}
            />
            <NumInput
              label="H"
              value={ts.height}
              min={1}
              unit="px"
              ocid="transform_panel.height.input"
              onChange={(v) => {
                if (lockAspect && ts.height > 0) {
                  dispatchChange({
                    height: v,
                    width: Math.round(v * aspectRef.current),
                  });
                } else {
                  dispatchChange({ height: v });
                }
              }}
            />
          </div>
          {/* Scale % */}
          <div style={{ marginTop: 8 }}>
            <NumInput
              label="Scale %"
              value={scalePercent}
              min={1}
              max={2000}
              unit="%"
              ocid="transform_panel.scale_pct.input"
              onChange={(pct) => {
                const f = pct / 100;
                dispatchChange({
                  width: Math.max(4, Math.round(origW * f)),
                  height: Math.max(4, Math.round(origH * f)),
                });
              }}
            />
          </div>
        </div>

        {/* Rotation */}
        <div style={sectionDivider}>
          <SliderRow
            label="Rotation"
            value={ts.angle}
            min={-180}
            max={180}
            unit="°"
            ocid="transform_panel.angle.slider"
            accentColor={accentColor}
            onChange={(v) => dispatchChange({ angle: v })}
          />
          <div style={{ marginTop: 6 }}>
            <NumInput
              label=""
              value={ts.angle}
              min={-360}
              max={360}
              unit="°"
              ocid="transform_panel.angle.input"
              onChange={(v) => dispatchChange({ angle: v })}
            />
          </div>
          {/* Quick rotate buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 5,
              marginTop: 8,
            }}
          >
            {([-90, -45, 45, 90] as const).map((deg) => (
              <button
                key={deg}
                type="button"
                data-ocid={`transform_panel.rotate_${deg < 0 ? "m" : "p"}${Math.abs(deg)}.button`}
                onClick={() => dispatchChange({ angle: ts.angle + deg })}
                style={{
                  padding: "5px 0",
                  borderRadius: 7,
                  border: `1px solid ${border}`,
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(160,160,172,0.8)",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.13s",
                  userSelect: "none",
                }}
              >
                {deg > 0 ? `+${deg}°` : `${deg}°`}
              </button>
            ))}
          </div>
          {/* Reset rotation */}
          <button
            type="button"
            data-ocid="transform_panel.reset_angle.button"
            onClick={() => dispatchChange({ angle: 0 })}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "5px 0",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(160,160,172,0.6)",
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.14s",
              userSelect: "none",
            }}
          >
            ↺ Reset to 0°
          </button>
        </div>

        {/* Skew (collapsible) */}
        <div style={sectionDivider}>
          <button
            type="button"
            onClick={() => setShowSkew((v) => !v)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 0,
              marginBottom: showSkew ? 8 : 0,
            }}
          >
            <span style={labelStyle}>Skew</span>
            <span style={{ fontSize: 9, color: "rgba(161,161,170,0.5)" }}>
              {showSkew ? "▲" : "▼"}
            </span>
          </button>
          {showSkew && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SliderRow
                label="Skew X"
                value={skewX}
                min={-45}
                max={45}
                unit="°"
                ocid="transform_panel.skew_x.slider"
                accentColor={accentColor}
                onChange={(v) => dispatchChange({ skewX: v })}
              />
              <SliderRow
                label="Skew Y"
                value={skewY}
                min={-45}
                max={45}
                unit="°"
                ocid="transform_panel.skew_y.slider"
                accentColor={accentColor}
                onChange={(v) => dispatchChange({ skewY: v })}
              />
            </div>
          )}
        </div>

        {/* Pivot */}
        <div style={sectionDivider}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={labelStyle}>Pivot Point</span>
            {/* Pivot lock indicator */}
            <span
              style={{ fontSize: 12 }}
              title={
                ((ts as VectorTransformState).pivotLocked ?? true)
                  ? "Pivot locked at center"
                  : "Pivot unlocked — drag to move"
              }
              aria-label={
                ((ts as VectorTransformState).pivotLocked ?? true)
                  ? "Pivot locked"
                  : "Pivot unlocked"
              }
            >
              {isVectorMode &&
              ((ts as VectorTransformState).pivotLocked ?? true)
                ? "🔒"
                : isVectorMode
                  ? "🔓"
                  : ""}
            </span>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <NumInput
              label="Px"
              value={ts.pivotX ?? ts.x + ts.width / 2}
              unit="px"
              ocid="transform_panel.pivot_x.input"
              onChange={(v) =>
                dispatchChange({
                  pivotX: v,
                  ...(isVectorMode ? { pivotLocked: false } : {}),
                })
              }
            />
            <NumInput
              label="Py"
              value={ts.pivotY ?? ts.y + ts.height / 2}
              unit="px"
              ocid="transform_panel.pivot_y.input"
              onChange={(v) =>
                dispatchChange({
                  pivotY: v,
                  ...(isVectorMode ? { pivotLocked: false } : {}),
                })
              }
            />
          </div>
          {/* 9-point quick-set pivot grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 28px)",
              gridTemplateRows: "repeat(3, 20px)",
              gap: 3,
              margin: "8px auto",
              width: "fit-content",
            }}
            data-ocid="transform_panel.pivot_grid"
          >
            {(
              [
                { k: "TL", l: "↖", xF: 0, yF: 0 },
                { k: "T", l: "↑", xF: 0.5, yF: 0 },
                { k: "TR", l: "↗", xF: 1, yF: 0 },
                { k: "L", l: "←", xF: 0, yF: 0.5 },
                { k: "C", l: "·", xF: 0.5, yF: 0.5 },
                { k: "R", l: "→", xF: 1, yF: 0.5 },
                { k: "BL", l: "↙", xF: 0, yF: 1 },
                { k: "B", l: "↓", xF: 0.5, yF: 1 },
                { k: "BR", l: "↘", xF: 1, yF: 1 },
              ] as const
            ).map((p) => {
              const tx = ts.x + ts.width * p.xF;
              const ty = ts.y + ts.height * p.yF;
              const px = ts.pivotX ?? ts.x + ts.width / 2;
              const py = ts.pivotY ?? ts.y + ts.height / 2;
              const active = Math.abs(px - tx) < 2 && Math.abs(py - ty) < 2;
              return (
                <button
                  key={p.k}
                  type="button"
                  title={p.k}
                  data-ocid={`transform_panel.pivot_grid.${p.k.toLowerCase()}`}
                  onClick={() =>
                    dispatchChange({
                      pivotX: tx,
                      pivotY: ty,
                      ...(isVectorMode ? { pivotLocked: p.k === "C" } : {}),
                    })
                  }
                  style={{
                    width: 28,
                    height: 20,
                    borderRadius: 5,
                    border: `1px solid ${active ? `${accentColor}99` : border}`,
                    background: active
                      ? `${accentColor}25`
                      : "rgba(255,255,255,0.04)",
                    color: active ? accentColor : "rgba(160,160,172,0.55)",
                    fontSize: p.k === "C" ? 16 : 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.14s",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  {p.l}
                </button>
              );
            })}
          </div>
          {/* Reset Pivot button */}
          <button
            type="button"
            data-ocid="transform_panel.reset_pivot.button"
            onClick={() => {
              if (onResetPivot) {
                onResetPivot();
              } else {
                dispatchChange({
                  pivotX: ts.x + ts.width / 2,
                  pivotY: ts.y + ts.height / 2,
                  ...(isVectorMode ? { pivotLocked: true } : {}),
                });
              }
            }}
            style={{
              width: "100%",
              marginTop: 2,
              padding: "6px 0",
              borderRadius: 8,
              border: `1px solid ${isVectorMode && ((ts as VectorTransformState).pivotLocked ?? true) ? `${accentColor}55` : border}`,
              background:
                isVectorMode &&
                ((ts as VectorTransformState).pivotLocked ?? true)
                  ? `${accentColor}15`
                  : "rgba(255,255,255,0.04)",
              color:
                isVectorMode &&
                ((ts as VectorTransformState).pivotLocked ?? true)
                  ? accentColor
                  : "rgba(161,161,170,0.7)",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.14s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <span>
              {isVectorMode &&
              ((ts as VectorTransformState).pivotLocked ?? true)
                ? "🔒"
                : "🔓"}
            </span>
            <span>
              {isVectorMode &&
              ((ts as VectorTransformState).pivotLocked ?? true)
                ? "Pivot Locked at Center"
                : "Reset Pivot to Center"}
            </span>
          </button>
        </div>

        {/* Snapping */}
        <div style={sectionDivider}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={labelStyle}>Snapping</span>
            <button
              type="button"
              data-ocid="transform_panel.snap.toggle"
              onClick={() => dispatchChange({ snapEnabled: !snapEnabled })}
              style={{
                padding: "2px 10px",
                borderRadius: 12,
                border: `1px solid ${snapEnabled ? `${accentColor}55` : border}`,
                background: snapEnabled
                  ? `${accentColor}22`
                  : "rgba(255,255,255,0.04)",
                color: snapEnabled ? accentColor : "rgba(161,161,170,0.5)",
                fontSize: 9,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.14s",
                letterSpacing: "0.05em",
              }}
            >
              {snapEnabled ? "ON" : "OFF"}
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <SliderRow
              label="Grid Size"
              value={gridSize}
              min={5}
              max={50}
              step={5}
              unit="px"
              ocid="transform_panel.grid_size.slider"
              accentColor={accentColor}
              onChange={(v) => dispatchChange({ gridSize: v })}
            />
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 9,
              color: "rgba(107,107,112,0.7)",
            }}
          >
            Grid · Canvas edges · Objects
          </div>
        </div>

        {/* Flip + Reset */}
        <div style={sectionDivider}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Flip & Reset</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
            }}
          >
            <ActionBtn
              label="↔ H"
              ocid="transform_panel.flip_h.button"
              accent={accentColor}
              onClick={() => {
                if (onFlipH) {
                  onFlipH();
                } else {
                  const flipH = isVectorMode
                    ? (vectorTransformState?.flipH ?? false)
                    : (transformState?.flipH ?? false);
                  dispatchChange({ flipH: !flipH });
                }
              }}
            />
            <ActionBtn
              label="↕ V"
              ocid="transform_panel.flip_v.button"
              accent={accentColor}
              onClick={() => {
                if (onFlipV) {
                  onFlipV();
                } else {
                  const flipV = isVectorMode
                    ? (vectorTransformState?.flipV ?? false)
                    : (transformState?.flipV ?? false);
                  dispatchChange({ flipV: !flipV });
                }
              }}
            />
            <ActionBtn
              label="↺ Reset"
              ocid="transform_panel.reset.button"
              accent="#f87171"
              onClick={() => {
                if (onReset) {
                  onReset();
                } else {
                  dispatchChange({
                    angle: 0,
                    skewX: 0,
                    skewY: 0,
                    scaleX: 1,
                    scaleY: 1,
                    flipH: false,
                    flipV: false,
                  });
                }
              }}
            />
          </div>
        </div>

        {/* AI Assist */}
        <div style={sectionDivider}>
          <button
            type="button"
            onClick={() => setShowAI((v) => !v)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 0 6px 0",
            }}
          >
            <span style={{ fontSize: 11 }}>✨</span>
            <span style={{ ...labelStyle, fontSize: 10 }}>AI Suggestions</span>
            <span
              style={{
                fontSize: 9,
                color: "rgba(161,161,170,0.4)",
                marginLeft: "auto",
              }}
            >
              {showAI ? "▲" : "▼"}
            </span>
          </button>
          {showAI && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {suggestions.map((s) => (
                <SuggestionPill key={s.label} s={s} accent={accentColor} />
              ))}
            </div>
          )}
        </div>

        {/* Keyboard hints */}
        <div
          style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingTop: 2 }}
        >
          {[
            ["⏎", "Apply"],
            ["Esc", "Cancel"],
            ["H/V", "Flip"],
            ["[]", "Rotate"],
            ["⇧+↑↓", "Nudge 10px"],
          ].map(([key, action]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 9,
                color: "rgba(107,107,112,0.6)",
              }}
            >
              <span
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 4,
                  padding: "1px 4px",
                  fontFamily: "monospace",
                  fontSize: 9,
                }}
              >
                {key}
              </span>
              <span>{action}</span>
            </div>
          ))}
        </div>

        {/* Confirm/Cancel row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            paddingTop: 4,
          }}
        >
          <button
            type="button"
            data-ocid="transform_panel.confirm.bottom.button"
            onClick={handleConfirm}
            style={{
              padding: "8px 0",
              borderRadius: 10,
              border: "1px solid rgba(34,197,94,0.4)",
              background: "rgba(34,197,94,0.12)",
              color: "#22c55e",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            ✓ Apply
          </button>
          <button
            type="button"
            data-ocid="transform_panel.cancel.bottom.button"
            onClick={handleCancel}
            style={{
              padding: "8px 0",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
              color: "rgba(239,68,68,0.7)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
