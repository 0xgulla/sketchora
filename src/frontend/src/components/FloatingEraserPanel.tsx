import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface FloatingEraserPanelProps {
  eraserSize: number;
  onEraserSizeChange: (v: number) => void;
  eraserSoftness: "hard" | "soft";
  onEraserSoftnessChange: (v: "hard" | "soft") => void;
  accentColor: string;
  onClose: () => void;
}

export default function FloatingEraserPanel({
  eraserSize,
  onEraserSizeChange,
  eraserSoftness,
  onEraserSoftnessChange,
  accentColor,
  onClose,
}: FloatingEraserPanelProps) {
  const [pos, setPos] = useState({ x: 80, y: 250 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

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
  };
  const valueStyle = {
    fontSize: 11,
    color: "#a1a1aa",
    minWidth: 28,
    textAlign: "right" as const,
  };

  return (
    <div
      data-ocid="eraser_panel.panel"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 220,
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
          Eraser Settings
        </span>
        <button
          type="button"
          onClick={onClose}
          data-ocid="eraser_panel.close_button"
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
        {/* Preview circle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 60,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              width: Math.min(50, eraserSize),
              height: Math.min(50, eraserSize),
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.6)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
              background:
                eraserSoftness === "soft"
                  ? "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)"
                  : "rgba(255,255,255,0.08)",
              transition: "all 0.15s",
            }}
          />
        </div>

        {/* Eraser Size */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Size</span>
            <span style={valueStyle}>{eraserSize}px</span>
          </div>
          <input
            type="range"
            min={1}
            max={200}
            value={eraserSize}
            onChange={(e) => onEraserSizeChange(Number(e.target.value))}
            data-ocid="eraser_panel.size.input"
            style={{ accentColor, width: "100%" }}
          />
        </div>

        {/* Soft / Hard Toggle */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>Type</span>
          <div style={{ display: "flex", gap: 6 }}>
            {(["hard", "soft"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onEraserSoftnessChange(type)}
                data-ocid={`eraser_panel.${type}.toggle`}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  borderRadius: 7,
                  border: `1.5px solid ${
                    eraserSoftness === type
                      ? accentColor
                      : "rgba(255,255,255,0.08)"
                  }`,
                  background:
                    eraserSoftness === type
                      ? `${accentColor}22`
                      : "rgba(255,255,255,0.04)",
                  color: eraserSoftness === type ? accentColor : "#6b6b70",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  transition: "all 0.15s",
                }}
              >
                {type === "hard" ? "Hard" : "Soft"}
              </button>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div
          style={{
            fontSize: 10,
            color: "#505055",
            lineHeight: 1.5,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: 10,
          }}
        >
          <kbd
            style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 3,
              padding: "1px 4px",
              color: "#888",
            }}
          >
            Shift
          </kbd>{" "}
          + drag for straight line
        </div>
      </div>
    </div>
  );
}
