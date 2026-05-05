import type { BrushShape } from "./DrawingCanvas";
import type { DrawingTool } from "./LeftToolbar";

interface ToolSettingsPanelProps {
  activeTool: DrawingTool;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushColor: string;
  onBrushColorChange: (color: string) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  brushShape: BrushShape;
  onBrushShapeChange: (shape: BrushShape) => void;
  uiTheme: "default" | "purple";
  accentColor: string;
  accentBg: string;
}

const BRUSH_SHAPES: { id: BrushShape; label: string }[] = [
  { id: "circle", label: "●" },
  { id: "square", label: "■" },
  { id: "rectangle", label: "▬" },
  { id: "triangle", label: "▲" },
  { id: "diamond", label: "◆" },
  { id: "star", label: "★" },
];

export default function ToolSettingsPanel({
  activeTool,
  brushSize,
  onBrushSizeChange,
  brushColor,
  onBrushColorChange,
  opacity,
  onOpacityChange,
  brushShape,
  onBrushShapeChange,
  uiTheme,
  accentColor,
  accentBg,
}: ToolSettingsPanelProps) {
  const borderColor = uiTheme === "purple" ? "#3a2d5a" : "#2a2a2e";
  const bg = uiTheme === "purple" ? "#18102a" : "#161618";
  const mutedText = "#6b6b70";
  const labelColor = "#a1a1aa";

  const label = (text: string) => (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: mutedText,
      }}
    >
      {text}
    </span>
  );

  const renderSlider = (
    id: string,
    value: number,
    min: number,
    max: number,
    onChange: (v: number) => void,
    ocid: string,
  ) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-ocid={ocid}
        style={{
          width: 90,
          accentColor: accentColor,
          cursor: "pointer",
        }}
      />
      <span
        style={{
          fontSize: 11,
          color: labelColor,
          minWidth: 24,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );

  const divider = (
    <div
      style={{
        width: 1,
        height: 20,
        background: borderColor,
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );

  const renderBrushSettings = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Color")}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => onBrushColorChange(e.target.value)}
          data-ocid="settings.brush.input"
          style={{
            width: 28,
            height: 22,
            borderRadius: 4,
            border: `1px solid ${borderColor}`,
            background: "transparent",
            cursor: "pointer",
            padding: 1,
          }}
          title="Brush color"
        />
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: brushColor,
            border: `1px solid ${borderColor}`,
            flexShrink: 0,
          }}
        />
      </div>
      {divider}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Size")}
        {renderSlider(
          "brush-size",
          brushSize,
          1,
          40,
          onBrushSizeChange,
          "settings.size.input",
        )}
      </div>
      {divider}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Opacity")}
        {renderSlider(
          "brush-opacity",
          opacity,
          1,
          100,
          onOpacityChange,
          "settings.opacity.input",
        )}
      </div>
      {divider}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Shape")}
        <div style={{ display: "flex", gap: 3 }}>
          {BRUSH_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onBrushShapeChange(s.id)}
              data-ocid={`settings.shape.${s.id}.button`}
              title={s.id}
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                border: `1px solid ${brushShape === s.id ? accentColor : borderColor}`,
                background: brushShape === s.id ? accentBg : "transparent",
                color: brushShape === s.id ? accentColor : labelColor,
                cursor: "pointer",
                fontSize: 12,
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
    </>
  );

  const renderEraserSettings = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Size")}
        {renderSlider(
          "eraser-size",
          brushSize,
          1,
          60,
          onBrushSizeChange,
          "settings.size.input",
        )}
      </div>
      {divider}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Opacity")}
        {renderSlider(
          "eraser-opacity",
          opacity,
          1,
          100,
          onOpacityChange,
          "settings.opacity.input",
        )}
      </div>
    </>
  );

  const renderShapeSettings = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Shape")}
        <div style={{ display: "flex", gap: 3 }}>
          {BRUSH_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onBrushShapeChange(s.id)}
              data-ocid={`settings.shape.${s.id}.button`}
              title={s.id}
              style={{
                width: 26,
                height: 26,
                borderRadius: 5,
                border: `1px solid ${brushShape === s.id ? accentColor : borderColor}`,
                background: brushShape === s.id ? accentBg : "transparent",
                color: brushShape === s.id ? accentColor : labelColor,
                cursor: "pointer",
                fontSize: 12,
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
      {divider}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Stroke")}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => onBrushColorChange(e.target.value)}
          data-ocid="settings.shape_stroke.input"
          style={{
            width: 28,
            height: 22,
            borderRadius: 4,
            border: `1px solid ${borderColor}`,
            background: "transparent",
            cursor: "pointer",
            padding: 1,
          }}
          title="Stroke color"
        />
      </div>
      {divider}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Size")}
        {renderSlider(
          "shape-size",
          brushSize,
          4,
          80,
          onBrushSizeChange,
          "settings.size.input",
        )}
      </div>
    </>
  );

  const renderFillSettings = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Fill Color")}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => onBrushColorChange(e.target.value)}
          data-ocid="settings.fill.input"
          style={{
            width: 28,
            height: 22,
            borderRadius: 4,
            border: `1px solid ${borderColor}`,
            background: "transparent",
            cursor: "pointer",
            padding: 1,
          }}
          title="Fill color"
        />
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: brushColor,
            border: `1px solid ${borderColor}`,
          }}
        />
      </div>
      {divider}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Opacity")}
        {renderSlider(
          "fill-opacity",
          opacity,
          1,
          100,
          onOpacityChange,
          "settings.opacity.input",
        )}
      </div>
      {divider}
      <span style={{ fontSize: 11, color: mutedText }}>
        Click canvas area to fill
      </span>
    </>
  );

  const renderTextSettings = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Font Size")}
        {renderSlider(
          "text-size",
          brushSize,
          8,
          72,
          onBrushSizeChange,
          "settings.size.input",
        )}
      </div>
      {divider}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label("Color")}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => onBrushColorChange(e.target.value)}
          data-ocid="settings.text.input"
          style={{
            width: 28,
            height: 22,
            borderRadius: 4,
            border: `1px solid ${borderColor}`,
            background: "transparent",
            cursor: "pointer",
            padding: 1,
          }}
          title="Text color"
        />
      </div>
      {divider}
      <span style={{ fontSize: 11, color: mutedText }}>
        Click canvas to place text
      </span>
    </>
  );

  const renderSelectSettings = () => (
    <span style={{ fontSize: 11, color: mutedText }}>
      Click and drag to select area
    </span>
  );

  const renderColorPickerSettings = () => (
    <span style={{ fontSize: 11, color: mutedText }}>
      Click canvas to pick a color
    </span>
  );

  const renderLayersSettings = () => (
    <span style={{ fontSize: 11, color: mutedText }}>
      Layer management coming soon
    </span>
  );

  const renderContent = () => {
    switch (activeTool) {
      case "brush":
        return renderBrushSettings();
      case "eraser":
        return renderEraserSettings();
      case "shape":
        return renderShapeSettings();
      case "fill":
        return renderFillSettings();
      case "text":
        return renderTextSettings();
      case "select":
        return renderSelectSettings();
      case "colorpicker":
        return renderColorPickerSettings();
      case "layers":
        return renderLayersSettings();
      default:
        return null;
    }
  };

  const TOOL_LABELS: Record<DrawingTool, string> = {
    brush: "Brush",
    eraser: "Eraser",
    shape: "Shape",
    fill: "Fill Bucket",
    text: "Text",
    select: "Select / Move",
    colorpicker: "Color Picker",
    layers: "Layers",
    pan: "Pan",
  };

  return (
    <div
      style={{
        background: bg,
        borderBottom: `1px solid ${borderColor}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
        height: 44,
        flexShrink: 0,
        overflowX: "auto",
        overflowY: "hidden",
      }}
      data-ocid="settings.panel"
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: accentColor,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          minWidth: 80,
          flexShrink: 0,
        }}
      >
        {TOOL_LABELS[activeTool]}
      </span>
      <div
        style={{
          width: 1,
          height: 20,
          background: borderColor,
          margin: "0 4px",
          flexShrink: 0,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flex: 1,
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}
