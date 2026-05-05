import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Move,
  Underline,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface TextOptions {
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: CanvasTextAlign;
  color: string;
}

interface FloatingTextPanelProps {
  initialX: number;
  initialY: number;
  canvasX: number;
  canvasY: number;
  color: string;
  accentColor: string;
  onConfirm: (options: TextOptions) => void;
  onCancel: () => void;
}

const FONT_FAMILIES = [
  "Arial",
  "Georgia",
  "Courier New",
  "Verdana",
  "Times New Roman",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
];

export default function FloatingTextPanel({
  initialX,
  initialY,
  color,
  accentColor,
  onConfirm,
  onCancel,
}: FloatingTextPanelProps) {
  const [pos, setPos] = useState({
    x: Math.min(initialX, window.innerWidth - 320),
    y: Math.max(60, initialY - 80),
  });
  const [text, setText] = useState("");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(24);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<CanvasTextAlign>("left");
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
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

  const handleConfirm = useCallback(() => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    onConfirm({
      text,
      fontFamily,
      fontSize,
      bold,
      italic,
      underline,
      textAlign,
      color,
    });
  }, [
    text,
    fontFamily,
    fontSize,
    bold,
    italic,
    underline,
    textAlign,
    color,
    onConfirm,
    onCancel,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        handleConfirm();
      }
      e.stopPropagation();
    },
    [onCancel, handleConfirm],
  );

  const previewFont = `${italic ? "italic" : "normal"} ${bold ? "700" : "400"} ${fontSize}px ${fontFamily}`;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: 28,
    height: 28,
    borderRadius: 6,
    border: active
      ? `1px solid ${accentColor}88`
      : "1px solid rgba(255,255,255,0.12)",
    background: active ? `${accentColor}20` : "transparent",
    color: active ? accentColor : "#9ca3af",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.12s",
  });

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 300,
        background: "rgba(18,18,28,0.97)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        zIndex: 9500,
        overflow: "hidden",
        userSelect: "none",
      }}
      data-ocid="text.panel"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          cursor: "grab",
          background: "rgba(255,255,255,0.03)",
        }}
        onMouseDown={onHeaderMouseDown}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Move size={12} color="#6b7280" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Text Tool
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
          }}
          data-ocid="text.close_button"
        >
          <X size={14} />
        </button>
      </div>

      <div
        style={{
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Font family */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              minWidth: 40,
            }}
          >
            Font
          </span>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            data-ocid="text.font.select"
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              color: "#e5e7eb",
              fontSize: 11,
              padding: "4px 6px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f} style={{ background: "#1c1c28" }}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Font size */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              minWidth: 40,
            }}
          >
            Size
          </span>
          <input
            type="range"
            min={8}
            max={200}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            data-ocid="text.size.input"
            style={{ flex: 1, accentColor }}
          />
          <span
            style={{
              fontSize: 11,
              color: "#9ca3af",
              minWidth: 28,
              textAlign: "right",
            }}
          >
            {fontSize}px
          </span>
        </div>

        {/* Style toggles */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              minWidth: 40,
            }}
          >
            Style
          </span>
          <button
            type="button"
            style={btnStyle(bold)}
            onClick={() => setBold((v) => !v)}
            title="Bold"
            data-ocid="text.bold.toggle"
          >
            <Bold size={12} strokeWidth={bold ? 3 : 2} />
          </button>
          <button
            type="button"
            style={btnStyle(italic)}
            onClick={() => setItalic((v) => !v)}
            title="Italic"
            data-ocid="text.italic.toggle"
          >
            <Italic size={12} />
          </button>
          <button
            type="button"
            style={btnStyle(underline)}
            onClick={() => setUnderline((v) => !v)}
            title="Underline"
            data-ocid="text.underline.toggle"
          >
            <Underline size={12} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            style={btnStyle(textAlign === "left")}
            onClick={() => setTextAlign("left")}
            title="Align Left"
            data-ocid="text.align_left.toggle"
          >
            <AlignLeft size={12} />
          </button>
          <button
            type="button"
            style={btnStyle(textAlign === "center")}
            onClick={() => setTextAlign("center")}
            title="Center"
            data-ocid="text.align_center.toggle"
          >
            <AlignCenter size={12} />
          </button>
          <button
            type="button"
            style={btnStyle(textAlign === "right")}
            onClick={() => setTextAlign("right")}
            title="Align Right"
            data-ocid="text.align_right.toggle"
          >
            <AlignRight size={12} />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your text here..."
          data-ocid="text.textarea"
          rows={3}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color: "#e5e7eb",
            fontSize: 13,
            padding: "8px 10px",
            outline: "none",
            resize: "vertical",
            fontFamily,
            fontWeight: bold ? 700 : 400,
            fontStyle: italic ? "italic" : "normal",
            textDecoration: underline ? "underline" : "none",
            textAlign,
            boxSizing: "border-box",
          }}
        />

        {/* Preview */}
        {text && (
          <div
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Preview
            </span>
            <div
              style={{
                font: previewFont,
                color,
                textDecoration: underline ? "underline" : "none",
                textAlign,
                marginTop: 4,
                overflow: "hidden",
                maxHeight: 60,
                wordBreak: "break-word",
              }}
            >
              {text}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={onCancel}
            data-ocid="text.cancel_button"
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "#9ca3af",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            data-ocid="text.confirm_button"
            style={{
              flex: 2,
              padding: "7px 0",
              borderRadius: 7,
              border: "none",
              background: accentColor,
              color: "#fff",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Place Text (Ctrl+Enter)
          </button>
        </div>
      </div>
    </div>
  );
}
