import {
  Download,
  FileImage,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useState } from "react";
import type { CanvasTheme, PageSizeKey, UIAccent, UITheme } from "../App";
import { PAGE_SIZE_MAP } from "../App";
import type { BrushShape } from "./DrawingCanvas";
import LayersPanel, { type Layer, type LayerFilter } from "./LayersPanel";

const BRUSH_SHAPES: { key: BrushShape; label: string }[] = [
  { key: "circle", label: "\u25cf" },
  { key: "square", label: "\u25a0" },
  { key: "rectangle", label: "\u25ac" },
  { key: "triangle", label: "\u25b2" },
  { key: "diamond", label: "\u25c6" },
  { key: "star", label: "\u2605" },
];

const PRESET_COLORS = [
  "#ffffff",
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#38bdf8",
  "#818cf8",
  "#e879f9",
  "#f472b6",
  "#1a1a1a",
  "#6b7280",
];

type PanelTab = "layers" | "properties";

interface RightPanelProps {
  layers: Layer[];
  activeLayerId: number;
  onSetActive: (id: number) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: number) => void;
  onToggleVisible: (id: number) => void;
  onRenameLayer: (id: number, name: string) => void;
  onOpacityChange: (id: number, opacity: number) => void;
  onMoveLayer: (id: number, direction: "up" | "down") => void;
  onDuplicateLayer: (id: number) => void;
  onReorderLayers: (from: number, to: number) => void;
  brushColor: string;
  onBrushColorChange: (c: string) => void;
  brushSize: number;
  onBrushSizeChange: (s: number) => void;
  brushShape: BrushShape;
  onBrushShapeChange: (s: BrushShape) => void;
  opacity: number;
  onOpacityPropChange: (o: number) => void;
  canvasTheme: CanvasTheme;
  onThemeChange: (t: CanvasTheme) => void;
  uiTheme: UITheme;
  onUiThemeToggle: () => void;
  pageSizeKey: PageSizeKey;
  onPageSizeChange: (k: PageSizeKey) => void;
  onClear: () => void;
  uiAccent: UIAccent;
  layerFilters?: Record<number, LayerFilter>;
  onLayerFilterChange?: (id: number, filter: Partial<LayerFilter>) => void;
  layerThumbnails?: Record<number, string>;
  pageColor: string;
  onPageColorChange: (c: string) => void;
  onExportPng: () => void;
  onExportJpg: () => void;
}

export default function RightPanel({
  layers,
  activeLayerId,
  onSetActive,
  onAddLayer,
  onDeleteLayer,
  onToggleVisible,
  onRenameLayer,
  onOpacityChange,
  onMoveLayer,
  onDuplicateLayer,
  onReorderLayers,
  brushColor,
  onBrushColorChange,
  brushSize,
  onBrushSizeChange,
  brushShape,
  onBrushShapeChange,
  opacity,
  onOpacityPropChange,
  canvasTheme,
  onThemeChange,
  uiTheme,
  onUiThemeToggle,
  pageSizeKey,
  onPageSizeChange,
  onClear,
  uiAccent,
  layerFilters = {},
  onLayerFilterChange,
  layerThumbnails = {},
  pageColor,
  onPageColorChange,
  onExportPng,
  onExportJpg,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("layers");

  const accentColor =
    uiTheme === "purple" ? "oklch(0.72 0.22 290)" : "oklch(0.72 0.15 200)";
  const accentBg =
    uiTheme === "purple"
      ? "oklch(0.65 0.22 290 / 0.15)"
      : "oklch(0.72 0.15 200 / 0.15)";
  const accentBorder =
    uiTheme === "purple"
      ? "oklch(0.65 0.22 290 / 0.4)"
      : "oklch(0.72 0.15 200 / 0.4)";
  const panelBg = uiTheme === "purple" ? "#0e0a1a" : "oklch(0.11 0.006 240)";
  const panelBorder =
    uiTheme === "purple" ? "oklch(0.22 0.06 290)" : "oklch(0.2 0.005 240)";

  const Section = ({
    title,
    children,
  }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "oklch(0.45 0.005 240)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
          padding: "0 14px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );

  const SliderRow = ({
    label,
    value,
    min,
    max,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
  }) => (
    <div
      style={{
        padding: "4px 14px",
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "oklch(0.55 0.005 240)" }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "oklch(0.75 0.005 240)",
            minWidth: 28,
            textAlign: "right" as const,
          }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor }}
      />
    </div>
  );

  const renderLayers = () => (
    <LayersPanel
      layers={layers}
      activeLayerId={activeLayerId}
      onSetActive={onSetActive}
      onAddLayer={onAddLayer}
      onDeleteLayer={onDeleteLayer}
      onToggleVisible={onToggleVisible}
      onRenameLayer={onRenameLayer}
      onOpacityChange={onOpacityChange}
      onMoveLayer={onMoveLayer}
      onDuplicateLayer={onDuplicateLayer}
      onReorderLayers={onReorderLayers}
      layerFilters={layerFilters}
      onLayerFilterChange={onLayerFilterChange ?? (() => {})}
      thumbnails={layerThumbnails}
      uiTheme={uiTheme}
      uiAccent={uiAccent}
    />
  );

  const renderProperties = () => (
    <div
      style={{
        overflowY: "auto" as const,
        flex: 1,
        padding: "8px 0",
        scrollbarWidth: "thin",
        scrollbarColor: "#3a3a4a #141420",
      }}
    >
      <Section title="Color">
        <div style={{ padding: "0 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: brushColor,
                border: "2px solid oklch(0.28 0.005 240)",
                position: "relative" as const,
                overflow: "hidden",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              <input
                type="color"
                value={brushColor}
                onChange={(e) => onBrushColorChange(e.target.value)}
                data-ocid="rightpanel.color.input"
                style={{
                  position: "absolute" as const,
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                }}
                title="Pick color"
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "oklch(0.85 0.005 240)",
                  fontFamily: "monospace",
                }}
              >
                {brushColor.toUpperCase()}
              </div>
              <div style={{ fontSize: 10, color: "oklch(0.45 0.005 240)" }}>
                Click swatch to change
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 4,
            }}
          >
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onBrushColorChange(c)}
                title={c}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 5,
                  background: c,
                  border:
                    brushColor === c
                      ? `2px solid ${accentColor}`
                      : "2px solid oklch(0.25 0.005 240)",
                  cursor: "pointer",
                  transition: "transform 0.1s",
                }}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Brush">
        <SliderRow
          label="Size"
          value={brushSize}
          min={1}
          max={80}
          onChange={onBrushSizeChange}
        />
        <SliderRow
          label="Opacity"
          value={opacity}
          min={1}
          max={100}
          onChange={onOpacityPropChange}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 14px",
          }}
        >
          <div
            style={{
              borderRadius: "50%",
              background: brushColor,
              width: Math.min(brushSize * 2, 64),
              height: Math.min(brushSize * 2, 64),
              opacity: opacity / 100,
              transition: "all 0.1s",
              boxShadow: `0 2px 12px ${brushColor}60`,
            }}
          />
        </div>
      </Section>

      <Section title="Shape">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 4,
            padding: "0 14px",
          }}
        >
          {BRUSH_SHAPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onBrushShapeChange(s.key)}
              data-ocid={`rightpanel.shape.${s.key}.toggle`}
              title={s.key}
              style={{
                height: 32,
                borderRadius: 7,
                border: `1px solid ${
                  brushShape === s.key ? accentBorder : "oklch(0.22 0.005 240)"
                }`,
                background: brushShape === s.key ? accentBg : "transparent",
                color:
                  brushShape === s.key ? accentColor : "oklch(0.55 0.005 240)",
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.12s",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Canvas settings moved from Settings tab */}
      <Section title="Canvas Theme">
        <div style={{ display: "flex", gap: 6, padding: "0 14px" }}>
          {(["light", "dark"] as CanvasTheme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onThemeChange(t)}
              data-ocid={`settings.canvas_theme.${t}.toggle`}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${
                  canvasTheme === t ? accentBorder : "oklch(0.22 0.005 240)"
                }`,
                background:
                  canvasTheme === t ? accentBg : "oklch(0.15 0.005 240)",
                color:
                  canvasTheme === t ? accentColor : "oklch(0.55 0.005 240)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                fontFamily: "inherit",
                transition: "all 0.12s",
              }}
            >
              {t === "light" ? <Sun size={12} /> : <Moon size={12} />}
              {t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Page Color">
        <div style={{ padding: "0 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: pageColor,
              border: "2px solid oklch(0.28 0.005 240)",
              position: "relative" as const,
              overflow: "hidden",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <input
              type="color"
              value={pageColor}
              onChange={(e) => onPageColorChange(e.target.value)}
              data-ocid="rightpanel.page_color.input"
              style={{
                position: "absolute" as const,
                inset: 0,
                opacity: 0,
                cursor: "pointer",
                width: "100%",
                height: "100%",
              }}
              title="Pick page color"
            />
          </div>
          <span style={{ fontSize: 11, color: "oklch(0.6 0.005 240)", fontFamily: "monospace" }}>
            {pageColor.toUpperCase()}
          </span>
        </div>
      </Section>

      <Section title="Page Size">
        <div
          style={{
            display: "flex",
            flexDirection: "column" as const,
            gap: 3,
            padding: "0 14px",
          }}
        >
          {(Object.keys(PAGE_SIZE_MAP) as PageSizeKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onPageSizeChange(key)}
              data-ocid={`settings.page_size.${key.toLowerCase()}.toggle`}
              style={{
                height: 30,
                borderRadius: 7,
                padding: "0 10px",
                border: `1px solid ${
                  pageSizeKey === key ? accentBorder : "oklch(0.2 0.005 240)"
                }`,
                background: pageSizeKey === key ? accentBg : "transparent",
                color:
                  pageSizeKey === key ? accentColor : "oklch(0.55 0.005 240)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: pageSizeKey === key ? 600 : 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "inherit",
                transition: "all 0.12s",
              }}
            >
              <span>{PAGE_SIZE_MAP[key].label}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>
                {PAGE_SIZE_MAP[key].width}\u00d7{PAGE_SIZE_MAP[key].height}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="UI Accent">
        <div style={{ padding: "0 14px" }}>
          <button
            type="button"
            onClick={onUiThemeToggle}
            data-ocid="settings.ui_theme.toggle"
            style={{
              width: "100%",
              height: 32,
              borderRadius: 8,
              border: `1px solid ${
                uiTheme === "purple"
                  ? "oklch(0.5 0.22 290 / 0.5)"
                  : accentBorder
              }`,
              background:
                uiTheme === "purple"
                  ? "oklch(0.65 0.22 290 / 0.15)"
                  : accentBg,
              color:
                uiTheme === "purple" ? "oklch(0.72 0.22 290)" : accentColor,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            <Sparkles size={13} />
            {uiTheme === "purple" ? "Purple Accent" : "Cyan Accent"}
          </button>
        </div>
      </Section>

      <Section title="Export">
        <div style={{ padding: "0 14px", display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={onExportPng}
            data-ocid="rightpanel.export_png.button"
            style={{
              flex: 1,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${accentBorder}`,
              background: accentBg,
              color: accentColor,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontFamily: "inherit",
            }}
          >
            <FileImage size={12} /> PNG
          </button>
          <button
            type="button"
            onClick={onExportJpg}
            data-ocid="rightpanel.export_jpg.button"
            style={{
              flex: 1,
              height: 32,
              borderRadius: 8,
              border: "1px solid oklch(0.3 0.005 240)",
              background: "transparent",
              color: "oklch(0.65 0.005 240)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontFamily: "inherit",
            }}
          >
            <Download size={12} /> JPG
          </button>
        </div>
      </Section>

      <Section title="Canvas">
        <div style={{ padding: "0 14px" }}>
          <button
            type="button"
            onClick={onClear}
            data-ocid="settings.clear.button"
            style={{
              width: "100%",
              height: 32,
              borderRadius: 8,
              border: "1px solid oklch(0.577 0.245 27.325 / 0.4)",
              background: "oklch(0.577 0.245 27.325 / 0.1)",
              color: "oklch(0.7 0.2 27)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            Clear Canvas
          </button>
        </div>
      </Section>
    </div>
  );

  const TABS: { id: PanelTab; label: string; ocid: string }[] = [
    { id: "layers", label: "Layers", ocid: "rightpanel.layers_tab" },
    { id: "properties", label: "Props", ocid: "rightpanel.properties_tab" },
  ];

  return (
    <aside
      data-ocid="rightpanel.panel"
      style={{
        width: 240,
        display: "flex",
        flexDirection: "column" as const,
        flexShrink: 0,
        background: panelBg,
        borderLeft: `1px solid ${panelBorder}`,
        zIndex: 40,
        boxShadow: "-2px 0 16px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid oklch(0.2 0.005 240)",
          flexShrink: 0,
          padding: "0 6px",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            data-ocid={tab.ocid}
            style={{
              flex: 1,
              height: 40,
              fontSize: 11,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color:
                activeTab === tab.id ? accentColor : "oklch(0.5 0.005 240)",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${
                activeTab === tab.id ? accentColor : "transparent"
              }`,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              position: "relative" as const,
              top: 1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column" as const,
        }}
      >
        {activeTab === "layers" && renderLayers()}
        {activeTab === "properties" && renderProperties()}
      </div>
    </aside>
  );
}
