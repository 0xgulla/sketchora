import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type VectorShapeType =
  | "rect"
  | "circle"
  | "line"
  | "triangle"
  | "arrow"
  | "star"
  | "polygon";

interface FloatingShapePanelProps {
  selectedShape: VectorShapeType;
  onShapeSelect: (shape: VectorShapeType) => void;
  accentColor: string;
  onClose: () => void;
}

const SHAPES: { id: VectorShapeType; label: string; icon: string }[] = [
  { id: "rect", label: "Rectangle", icon: "⬜" },
  { id: "circle", label: "Circle / Ellipse", icon: "⬬" },
  { id: "line", label: "Line", icon: "╱" },
  { id: "triangle", label: "Triangle", icon: "△" },
  { id: "arrow", label: "Arrow", icon: "→" },
  { id: "star", label: "Star", icon: "★" },
  { id: "polygon", label: "Polygon", icon: "⬡" },
];

export default function FloatingShapePanel({
  selectedShape,
  onShapeSelect,
  accentColor,
  onClose,
}: FloatingShapePanelProps) {
  const [pos, setPos] = useState({ x: 70, y: 120 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    px: number;
    py: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        px: pos.x,
        py: pos.y,
      };
    },
    [pos],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        background: "rgba(14,14,22,0.97)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        zIndex: 8000,
        width: 200,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px 8px",
          cursor: "grab",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(180,180,210,0.7)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Shapes
        </span>
        <button
          type="button"
          onClick={onClose}
          data-ocid="shape_panel.close_button"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "rgba(140,140,170,0.7)",
            padding: 2,
            display: "flex",
            borderRadius: 6,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Shape grid */}
      <div
        style={{
          padding: "10px 12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {SHAPES.map((s) => {
          const isActive = selectedShape === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onShapeSelect(s.id)}
              data-ocid={`shape_panel.${s.id}.button`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 9,
                border: isActive
                  ? `1px solid ${accentColor}40`
                  : "1px solid transparent",
                background: isActive ? `${accentColor}18` : "transparent",
                color: isActive ? accentColor : "rgba(200,200,220,0.75)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                textAlign: "left",
                transition: "all 0.13s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(240,240,255,0.95)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(200,200,220,0.75)";
                }
              }}
            >
              <span style={{ fontSize: 16, minWidth: 22, textAlign: "center" }}>
                {s.icon}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <div
        style={{
          padding: "0 12px 10px",
          fontSize: 10,
          color: "rgba(120,120,150,0.7)",
          lineHeight: 1.4,
        }}
      >
        Click &amp; drag on canvas to draw
      </div>
    </div>
  );
}
