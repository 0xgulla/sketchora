import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BrushShape } from "./DrawingCanvas";

interface FloatingBrushPanelProps {
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
  hardness: number;
  onHardnessChange: (v: number) => void;
  brushColor: string;
  onBrushColorChange: (c: string) => void;
  brushShape: BrushShape;
  onBrushShapeChange: (s: BrushShape) => void;
  brushSmoothing: number;
  onBrushSmoothingChange: (v: number) => void;
  pressureSim: boolean;
  onPressureSimChange: (v: boolean) => void;
  accentColor: string;
  onClose: () => void;
}

const BRUSH_SHAPES: { id: BrushShape; label: string }[] = [
  { id: "circle", label: "●" },
  { id: "square", label: "■" },
  { id: "rectangle", label: "▬" },
  { id: "triangle", label: "▲" },
  { id: "diamond", label: "◆" },
  { id: "star", label: "★" },
  { id: "pentagon", label: "⬠" },
  { id: "hexagon", label: "⬡" },
  { id: "octagon", label: "⯃" },
  { id: "cross", label: "✚" },
  { id: "arrow", label: "➤" },
  { id: "heart", label: "♥" },
];

const PANEL_W = 252;

export default function FloatingBrushPanel({
  brushSize,
  onBrushSizeChange,
  opacity,
  onOpacityChange,
  hardness,
  onHardnessChange,
  brushColor,
  onBrushColorChange,
  brushShape,
  onBrushShapeChange,
  brushSmoothing,
  onBrushSmoothingChange,
  pressureSim,
  onPressureSimChange,
  accentColor,
  onClose,
}: FloatingBrushPanelProps) {
  const [pos, setPos] = useState({ x: 80, y: 58 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Clamp position within viewport
  const clampPos = useCallback((x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelH = panelRef.current?.offsetHeight ?? 420;
    return {
      x: Math.min(Math.max(0, x), vw - PANEL_W),
      y: Math.min(Math.max(0, y), vh - panelH),
    };
  }, []);

  const onMouseDown = useCallback(
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

  const labelStyle = {
    fontSize: 10,
    fontWeight: 600 as const,
    color: "rgba(161,161,170,0.8)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    minWidth: 62,
  };
  const valueStyle = {
    fontSize: 11,
    color: "rgba(161,161,170,0.9)",
    minWidth: 32,
    textAlign: "right" as const,
    fontVariantNumeric: "tabular-nums",
  };

  const SliderRow = ({
    label,
    value,
    min,
    max,
    unit,
    ocid,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    unit?: string;
    ocid: string;
    onChange: (v: number) => void;
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={labelStyle}>{label}</span>
        <span style={valueStyle}>
          {value}
          {unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-ocid={ocid}
        style={{ accentColor, width: "100%", cursor: "pointer" }}
      />
    </div>
  );

  return (
    <div
      ref={panelRef}
      data-ocid="brush_panel.panel"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: PANEL_W,
        background: "rgba(14,12,22,0.97)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        zIndex: 200,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)",
        animation: "float-in 0.2s ease-out",
        userSelect: "none",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          cursor: "grab",
          background: "rgba(255,255,255,0.025)",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#e8e8ec",
            letterSpacing: "-0.01em",
          }}
        >
          Brush Settings
        </span>
        <button
          type="button"
          onClick={onClose}
          data-ocid="brush_panel.close_button"
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            border: "none",
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.45)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        {/* Color */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Color</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: brushColor,
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  ...valueStyle,
                  minWidth: 0,
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              >
                {brushColor}
              </span>
            </div>
          </div>
          <input
            type="color"
            value={brushColor}
            onChange={(e) => onBrushColorChange(e.target.value)}
            data-ocid="brush_panel.color.input"
            style={{
              width: "100%",
              height: 28,
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              cursor: "pointer",
              padding: 2,
            }}
          />
        </div>

        <SliderRow
          label="Size"
          value={brushSize}
          min={1}
          max={60}
          unit="px"
          ocid="brush_panel.size.input"
          onChange={onBrushSizeChange}
        />
        <SliderRow
          label="Opacity"
          value={opacity}
          min={1}
          max={100}
          unit="%"
          ocid="brush_panel.opacity.input"
          onChange={onOpacityChange}
        />

        {/* Hardness */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Hardness</span>
            <span style={valueStyle}>{hardness}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={hardness}
            onChange={(e) => onHardnessChange(Number(e.target.value))}
            data-ocid="brush_panel.hardness.input"
            style={{ accentColor, width: "100%", cursor: "pointer" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.04em",
            }}
          >
            <span>SOFT</span>
            <span>HARD</span>
          </div>
        </div>

        {/* Brush Style */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={labelStyle}>Style</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6,1fr)",
              gap: 4,
            }}
          >
            {BRUSH_SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onBrushShapeChange(s.id)}
                data-ocid="brush_panel.shape.button"
                title={s.id}
                style={{
                  height: 30,
                  borderRadius: 8,
                  border: `1.5px solid ${
                    brushShape === s.id ? accentColor : "rgba(255,255,255,0.08)"
                  }`,
                  background:
                    brushShape === s.id
                      ? `${accentColor}22`
                      : "rgba(255,255,255,0.03)",
                  color:
                    brushShape === s.id ? accentColor : "rgba(161,161,170,0.7)",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.14s",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <SliderRow
          label="Smoothing"
          value={brushSmoothing}
          min={0}
          max={100}
          unit="%"
          ocid="brush_panel.smoothing.input"
          onChange={onBrushSmoothingChange}
        />

        {/* Pressure Sim toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={labelStyle}>Pressure Sim</span>
          <button
            type="button"
            onClick={() => onPressureSimChange(!pressureSim)}
            data-ocid="brush_panel.pressure.toggle"
            aria-pressed={pressureSim}
            style={{
              width: 38,
              height: 20,
              borderRadius: 10,
              background: pressureSim ? accentColor : "rgba(255,255,255,0.1)",
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: pressureSim ? 20 : 2,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
