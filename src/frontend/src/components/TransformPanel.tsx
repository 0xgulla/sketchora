/**
 * TransformPanel.tsx
 *
 * Clean, modern floating transform panel for Sketchora.
 * Sections: Position, Size (with aspect lock), Rotation, Actions.
 * Rotate ±90°, Flip H/V, Confirm/Cancel.
 * Draggable header, keyboard shortcuts, 9-point pivot grid.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { VectorTransformState } from "../lib/TransformTool";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransformPanelProps {
  state: VectorTransformState | null;
  isVisible: boolean;
  accentColor?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  onStateChange: (patch: Partial<VectorTransformState>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onReset: () => void;
  /** Called when user clicks "Reset Pivot" — sets pivotLocked=true and recenters pivot */
  onResetPivot?: () => void;
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const BG = "rgba(12,10,20,0.97)";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.09)";
const TEXT = "#e2e2e8";
const MUTED = "rgba(161,161,170,0.6)";
const GREEN = "#22c55e";
const RED = "rgba(239,68,68,0.75)";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: MUTED,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </span>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: BORDER,
        margin: "2px 0",
      }}
    />
  );
}

function NumInput({
  label,
  value,
  unit,
  min,
  max,
  ocid,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  ocid: string;
  accent: string;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  const displayVal = Math.round(value * 10) / 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Label>{label}</Label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: editing ? `${accent}12` : SURFACE,
          border: `1px solid ${editing ? `${accent}55` : BORDER}`,
          borderRadius: 8,
          overflow: "hidden",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <input
          type="number"
          value={editing ? raw : displayVal}
          min={min}
          max={max}
          step={1}
          data-ocid={ocid}
          onFocus={() => {
            setEditing(true);
            setRaw(String(displayVal));
          }}
          onBlur={() => {
            setEditing(false);
            const v = Number.parseFloat(raw);
            if (!Number.isNaN(v)) onChange(v);
          }}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = Number.parseFloat(raw);
              if (!Number.isNaN(v)) onChange(v);
              setEditing(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: TEXT,
            fontSize: 12,
            padding: "6px 8px",
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
              color: MUTED,
              paddingRight: 8,
              flexShrink: 0,
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  title,
  ocid,
  accent,
  active,
  danger,
  onClick,
}: {
  label: string;
  title?: string;
  ocid: string;
  accent?: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const borderColor = danger
    ? `rgba(239,68,68,${hovered ? 0.5 : 0.25})`
    : active || hovered
      ? `${accent ?? "oklch(0.72 0.15 200)"}55`
      : BORDER;
  const bg = danger
    ? `rgba(239,68,68,${hovered ? 0.12 : 0.05})`
    : active
      ? `${accent ?? "oklch(0.72 0.15 200)"}20`
      : hovered
        ? SURFACE
        : "transparent";
  const color = danger ? RED : active || hovered ? (accent ?? TEXT) : MUTED;

  return (
    <button
      type="button"
      data-ocid={ocid}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        padding: "7px 0",
        borderRadius: 9,
        border: `1px solid ${borderColor}`,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.13s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

const PANEL_W = 274;

export default function TransformPanel({
  state,
  isVisible,
  accentColor = "oklch(0.72 0.15 200)",
  canvasWidth = 1024,
  canvasHeight = 1024,
  onStateChange,
  onConfirm,
  onCancel,
  onFlipH,
  onFlipV,
  onReset,
  onResetPivot,
}: TransformPanelProps) {
  // ── Drag state ────────────────────────────────────────────────────────────
  const defaultX =
    typeof window !== "undefined" ? window.innerWidth - PANEL_W - 16 : 800;
  const [pos, setPos] = useState({ x: defaultX, y: 88 });
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ── Aspect ratio memory ───────────────────────────────────────────────────
  const aspectRef = useRef(1);
  useEffect(() => {
    if (state && state.height > 0)
      aspectRef.current = state.width / state.height;
  }, [state]);

  // ── Original size for scale% ──────────────────────────────────────────────
  const origRef = useRef({ w: 0, h: 0 });
  useEffect(() => {
    if (state && origRef.current.w === 0 && state.width > 0) {
      origRef.current = { w: state.width, h: state.height };
    }
  }, [state]);
  if (state && origRef.current.w === 0 && state.width > 0) {
    origRef.current = { w: state.width, h: state.height };
  }

  // ── Panel drag ────────────────────────────────────────────────────────────
  const clampPos = useCallback((x: number, y: number) => {
    const ph = panelRef.current?.offsetHeight ?? 460;
    return {
      x: Math.min(Math.max(0, x), window.innerWidth - PANEL_W),
      y: Math.min(Math.max(0, y), window.innerHeight - ph),
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

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, onConfirm, onCancel]);

  if (!state || !isVisible) return null;

  const lockAspect = state.aspectLocked ?? false;
  const snapEnabled = state.snapEnabled ?? false;
  const origW = origRef.current.w || state.width;
  const origH = origRef.current.h || state.height;
  const scalePercent =
    origW > 0 ? Math.round((state.width / origW) * 100) : 100;

  // AI quick actions
  const aiActions = [
    {
      label: "⊕ Center",
      ocid: "transform_panel.center.button",
      onClick: () =>
        onStateChange({
          x: canvasWidth / 2 - state.width / 2,
          y: canvasHeight / 2 - state.height / 2,
          pivotX: canvasWidth / 2,
          pivotY: canvasHeight / 2,
        }),
    },
    {
      label: "⟲ Straighten",
      ocid: "transform_panel.straighten.button",
      onClick: () => {
        const snapped = [0, 90, 180, -90].reduce(
          (best, t) =>
            Math.abs(state.angle - t) < Math.abs(state.angle - best) ? t : best,
          0,
        );
        onStateChange({ angle: snapped });
      },
    },
    {
      label: "⤢ Fill Canvas",
      ocid: "transform_panel.fill_canvas.button",
      onClick: () => {
        const scale = Math.min(
          canvasWidth / state.width,
          canvasHeight / state.height,
        );
        const nw = state.width * scale;
        const nh = state.height * scale;
        onStateChange({
          x: (canvasWidth - nw) / 2,
          y: (canvasHeight - nh) / 2,
          width: nw,
          height: nh,
        });
      },
    },
  ];

  return (
    <div
      ref={panelRef}
      data-ocid="transform_panel.panel"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: PANEL_W,
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        zIndex: 200,
        boxShadow: "0 8px 48px rgba(0,0,0,0.7), 0 2px 10px rgba(0,0,0,0.35)",
        userSelect: "none",
        backdropFilter: "blur(20px)",
        maxHeight: "calc(100vh - 88px)",
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
    >
      {/* ── Header ── */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: `1px solid ${BORDER}`,
          cursor: "grab",
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "rgba(14,12,24,0.98)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg
            width={12}
            height={12}
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
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: "0.01em",
            }}
          >
            Transform
          </span>
          <span
            style={{
              fontSize: 9,
              background: "rgba(34,197,94,0.14)",
              color: "#4ade80",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 10,
              padding: "1px 6px",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            VECTOR
          </span>
        </div>

        {/* Confirm / Cancel */}
        <div style={{ display: "flex", gap: 5 }}>
          <button
            type="button"
            onClick={onConfirm}
            data-ocid="transform_panel.confirm.button"
            title="Apply (Enter)"
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              border: "1px solid rgba(34,197,94,0.45)",
              background: "rgba(34,197,94,0.14)",
              color: GREEN,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              transition: "all 0.14s",
            }}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={onCancel}
            data-ocid="transform_panel.cancel.button"
            title="Cancel (Esc)"
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
              color: RED,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              transition: "all 0.14s",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          padding: "13px 13px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 13,
        }}
      >
        {/* ── POSITION ── */}
        <section>
          <Label>Position</Label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 7,
            }}
          >
            <NumInput
              label="X"
              value={state.x}
              unit="px"
              ocid="transform_panel.x.input"
              accent={accentColor}
              onChange={(v) =>
                onStateChange({ x: v, pivotX: v + state.width / 2 })
              }
            />
            <NumInput
              label="Y"
              value={state.y}
              unit="px"
              ocid="transform_panel.y.input"
              accent={accentColor}
              onChange={(v) =>
                onStateChange({ y: v, pivotY: v + state.height / 2 })
              }
            />
          </div>
        </section>

        <Divider />

        {/* ── SIZE ── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 7,
            }}
          >
            <Label>Size</Label>
            {/* Aspect lock toggle */}
            <button
              type="button"
              data-ocid="transform_panel.lock_aspect.toggle"
              title={lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
              onClick={() => onStateChange({ aspectLocked: !lockAspect })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: lockAspect ? `${accentColor}20` : SURFACE,
                border: `1px solid ${lockAspect ? `${accentColor}50` : BORDER}`,
                borderRadius: 7,
                padding: "2px 8px",
                cursor: "pointer",
                color: lockAspect ? accentColor : MUTED,
                fontSize: 9,
                letterSpacing: "0.05em",
                fontWeight: 600,
                transition: "all 0.13s",
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
              value={state.width}
              min={1}
              unit="px"
              ocid="transform_panel.width.input"
              accent={accentColor}
              onChange={(v) => {
                const w = Math.max(1, v);
                if (lockAspect && state.height > 0) {
                  onStateChange({
                    width: w,
                    height: Math.max(1, Math.round(w / aspectRef.current)),
                  });
                } else {
                  onStateChange({ width: w });
                }
              }}
            />
            <NumInput
              label="H"
              value={state.height}
              min={1}
              unit="px"
              ocid="transform_panel.height.input"
              accent={accentColor}
              onChange={(v) => {
                const h = Math.max(1, v);
                if (lockAspect && aspectRef.current > 0) {
                  onStateChange({
                    height: h,
                    width: Math.max(1, Math.round(h * aspectRef.current)),
                  });
                } else {
                  onStateChange({ height: h });
                }
              }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <NumInput
              label="Scale %"
              value={scalePercent}
              min={1}
              max={2000}
              unit="%"
              ocid="transform_panel.scale_pct.input"
              accent={accentColor}
              onChange={(pct) => {
                const f = pct / 100;
                onStateChange({
                  width: Math.max(1, Math.round(origW * f)),
                  height: Math.max(1, Math.round(origH * f)),
                });
              }}
            />
          </div>
        </section>

        <Divider />

        {/* ── ROTATION ── */}
        <section>
          <Label>Rotation</Label>
          <div style={{ marginTop: 7 }}>
            <NumInput
              label=""
              value={state.angle}
              min={-360}
              max={360}
              unit="°"
              ocid="transform_panel.angle.input"
              accent={accentColor}
              onChange={(v) => onStateChange({ angle: v })}
            />
          </div>
          {/* Rotation slider */}
          <div style={{ marginTop: 8 }}>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={Math.max(-180, Math.min(180, state.angle))}
              data-ocid="transform_panel.angle.slider"
              onChange={(e) => onStateChange({ angle: Number(e.target.value) })}
              style={{ accentColor, width: "100%", cursor: "pointer" }}
            />
          </div>
          {/* Quick rotate buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 5,
              marginTop: 7,
            }}
          >
            {([-90, -45, 45, 90] as const).map((deg) => (
              <button
                key={deg}
                type="button"
                data-ocid={`transform_panel.rotate_${deg < 0 ? "m" : "p"}${Math.abs(deg)}.button`}
                onClick={() => onStateChange({ angle: state.angle + deg })}
                style={{
                  padding: "6px 0",
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: SURFACE,
                  color: MUTED,
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.12s",
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
            onClick={() => onStateChange({ angle: 0 })}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "5px 0",
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: MUTED,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.13s",
            }}
          >
            ↺ Reset to 0°
          </button>
        </section>

        <Divider />

        {/* ── PIVOT ── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 7,
            }}
          >
            <Label>Pivot Point</Label>
            {/* Pivot lock indicator */}
            <span
              title={
                state.pivotLocked
                  ? "Pivot locked at center"
                  : "Pivot unlocked — drag to move"
              }
              style={{ fontSize: 12 }}
              aria-label={state.pivotLocked ? "Pivot locked" : "Pivot unlocked"}
            >
              {(state.pivotLocked ?? true) ? "🔒" : "🔓"}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 7,
            }}
          >
            <NumInput
              label="Px"
              value={state.pivotX ?? state.x + state.width / 2}
              unit="px"
              ocid="transform_panel.pivot_x.input"
              accent={accentColor}
              onChange={(v) => onStateChange({ pivotX: v, pivotLocked: false })}
            />
            <NumInput
              label="Py"
              value={state.pivotY ?? state.y + state.height / 2}
              unit="px"
              ocid="transform_panel.pivot_y.input"
              accent={accentColor}
              onChange={(v) => onStateChange({ pivotY: v, pivotLocked: false })}
            />
          </div>

          {/* 9-point pivot grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
              margin: "9px auto 0",
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
              const tx = state.x + state.width * p.xF;
              const ty = state.y + state.height * p.yF;
              const pX = state.pivotX ?? state.x + state.width / 2;
              const pY = state.pivotY ?? state.y + state.height / 2;
              const active = Math.abs(pX - tx) < 2.5 && Math.abs(pY - ty) < 2.5;
              return (
                <button
                  key={p.k}
                  type="button"
                  title={p.k}
                  data-ocid={`transform_panel.pivot_grid.${p.k.toLowerCase()}`}
                  onClick={() =>
                    onStateChange({
                      pivotX: tx,
                      pivotY: ty,
                      pivotLocked: p.k === "C",
                    })
                  }
                  style={{
                    width: 30,
                    height: 22,
                    borderRadius: 6,
                    border: `1px solid ${active ? `${accentColor}90` : BORDER}`,
                    background: active ? `${accentColor}25` : SURFACE,
                    color: active ? accentColor : MUTED,
                    fontSize: p.k === "C" ? 14 : 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.13s",
                    padding: 0,
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
                onStateChange({
                  pivotX: state.x + state.width / 2,
                  pivotY: state.y + state.height / 2,
                  pivotLocked: true,
                });
              }
            }}
            style={{
              width: "100%",
              marginTop: 7,
              padding: "6px 0",
              borderRadius: 8,
              border: `1px solid ${(state.pivotLocked ?? true) ? `${accentColor}55` : BORDER}`,
              background:
                (state.pivotLocked ?? true)
                  ? `${accentColor}15`
                  : "transparent",
              color: (state.pivotLocked ?? true) ? accentColor : MUTED,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.13s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <span>{(state.pivotLocked ?? true) ? "🔒" : "🔓"}</span>
            <span>
              {(state.pivotLocked ?? true)
                ? "Pivot Locked at Center"
                : "Reset Pivot to Center"}
            </span>
          </button>
        </section>

        <Divider />

        {/* ── ACTIONS ── */}
        <section>
          <Label>Actions</Label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              marginTop: 8,
            }}
          >
            <IconBtn
              label="↔ Flip H"
              ocid="transform_panel.flip_h.button"
              accent={accentColor}
              onClick={onFlipH}
            />
            <IconBtn
              label="↕ Flip V"
              ocid="transform_panel.flip_v.button"
              accent={accentColor}
              onClick={onFlipV}
            />
            <IconBtn
              label="↺ Reset"
              ocid="transform_panel.reset.button"
              danger
              onClick={onReset}
            />
          </div>

          {/* Snap toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Label>Snapping</Label>
            <button
              type="button"
              data-ocid="transform_panel.snap.toggle"
              onClick={() => onStateChange({ snapEnabled: !snapEnabled })}
              style={{
                padding: "3px 11px",
                borderRadius: 12,
                border: `1px solid ${snapEnabled ? `${accentColor}55` : BORDER}`,
                background: snapEnabled ? `${accentColor}20` : SURFACE,
                color: snapEnabled ? accentColor : MUTED,
                fontSize: 9,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.06em",
                transition: "all 0.13s",
              }}
            >
              {snapEnabled ? "ON" : "OFF"}
            </button>
          </div>
        </section>

        <Divider />

        {/* ── AI Quick Actions ── */}
        <section>
          <Label>Quick Assist</Label>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}
          >
            {aiActions.map((a) => (
              <button
                key={a.label}
                type="button"
                data-ocid={a.ocid}
                onClick={a.onClick}
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: `1px solid ${accentColor}35`,
                  background: `${accentColor}10`,
                  color: MUTED,
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.13s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    `${accentColor}22`;
                  (e.currentTarget as HTMLButtonElement).style.color =
                    accentColor;
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    `${accentColor}70`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    `${accentColor}10`;
                  (e.currentTarget as HTMLButtonElement).style.color = MUTED;
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    `${accentColor}35`;
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Confirm / Cancel row ── */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <button
            type="button"
            data-ocid="transform_panel.confirm.bottom.button"
            onClick={onConfirm}
            style={{
              padding: "9px 0",
              borderRadius: 11,
              border: "1px solid rgba(34,197,94,0.45)",
              background: "rgba(34,197,94,0.13)",
              color: GREEN,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.14s",
            }}
          >
            ✓ Apply
          </button>
          <button
            type="button"
            data-ocid="transform_panel.cancel.bottom.button"
            onClick={onCancel}
            style={{
              padding: "9px 0",
              borderRadius: 11,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
              color: RED,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.14s",
            }}
          >
            ✕ Cancel
          </button>
        </div>

        {/* ── Keyboard hints ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {[
            ["⏎", "Apply"],
            ["Esc", "Cancel"],
            ["⇧+drag", "Lock ratio"],
            ["Alt+drag", "From center"],
            ["Ctrl+drag", "Skew"],
          ].map(([key, action]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 9,
                color: "rgba(107,107,112,0.55)",
              }}
            >
              <span
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
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
      </div>
    </div>
  );
}
