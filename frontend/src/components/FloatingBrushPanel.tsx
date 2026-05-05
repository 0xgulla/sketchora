import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BrushShape } from "./DrawingCanvas";

interface FloatingBrushPanelProps {
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
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
];

export default function FloatingBrushPanel({
  brushSize,
  onBrushSizeChange,
  opacity,
  onOpacityChange,
  brushShape,
  onBrushShapeChange,
  brushSmoothing,
  onBrushSmoothingChange,
  pressureSim,
  onPressureSimChange,
  accentColor,
  onClose,
}: FloatingBrushPanelProps) {
  const [pos, setPos] = useState({ x: 80, y: 100 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

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
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
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
  }, []);

  const labelStyle = {
    fontSize: 10,
    fontWeight: 600,
    color: "#6b6b70",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    minWidth: 60,
  };
  const valueStyle = {
    fontSize: 11,
    color: "#a1a1aa",
    minWidth: 28,
    textAlign: "right" as const,
  };

  return (
    <div
      ref={panelRef}
      data-ocid="brush_panel.panel"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 240,
        background: "rgba(18,18,22,0.97)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
        zIndex: 200,
        overflow: "hidden",
        animation: "float-in 0.2s ease-out",
        userSelect: "none",
      }}
    >
      {/* Title bar — draggable */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: "grab",
          background: "rgba(255,255,255,0.03)",
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
            background: "rgba(255,255,255,0.06)",
            color: "#6b6b70",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Brush Size */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Size</span>
            <span style={valueStyle}>{brushSize}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            data-ocid="brush_panel.size.input"
            style={{ accentColor, width: "100%" }}
          />
        </div>

        {/* Opacity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Opacity</span>
            <span style={valueStyle}>{opacity}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={opacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            data-ocid="brush_panel.opacity.input"
            style={{ accentColor, width: "100%" }}
          />
        </div>

        {/* Brush Style */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={labelStyle}>Style</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {BRUSH_SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onBrushShapeChange(s.id)}
                data-ocid={"brush_panel.shape.button"}
                title={s.id}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  border: `1.5px solid ${brushShape === s.id ? accentColor : "rgba(255,255,255,0.08)"}`,
                  background:
                    brushShape === s.id
                      ? `${accentColor}20`
                      : "rgba(255,255,255,0.04)",
                  color: brushShape === s.id ? accentColor : "#6b6b70",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Smoothing */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Smoothing</span>
            <span style={valueStyle}>{brushSmoothing}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={brushSmoothing}
            onChange={(e) => onBrushSmoothingChange(Number(e.target.value))}
            data-ocid="brush_panel.smoothing.input"
            style={{ accentColor, width: "100%" }}
          />
        </div>

        {/* Pressure Sim */}
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
