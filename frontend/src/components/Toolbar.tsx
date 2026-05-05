import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Circle,
  Download,
  Eraser,
  FileText,
  Minus,
  Moon,
  Paintbrush,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
} from "lucide-react";
import type React from "react";
import { useRef } from "react";
import type { UIAccent } from "../App";
import { PAGE_SIZE_MAP } from "../App";
import type { PageDimensions, PageSizeKey } from "../App";
import type { BrushShape } from "./DrawingCanvas";

export type CanvasTheme = "light" | "dark";

interface ToolbarProps {
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushShape: BrushShape;
  setBrushShape: (shape: BrushShape) => void;
  activeTool: "brush" | "eraser";
  setActiveTool: (tool: "brush" | "eraser") => void;
  onClear: () => void;
  onUndo: () => void;
  onSave: () => void;
  strokeCount: number;
  canvasTheme: CanvasTheme;
  onThemeChange: (t: CanvasTheme) => void;
  uiTheme: "default" | "purple";
  onUiThemeToggle: () => void;
  uiAccent: UIAccent;
  pageSizeKey: PageSizeKey;
  setPageSizeKey: (k: PageSizeKey) => void;
  pageSize: PageDimensions;
}

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
];

const THEME_OPTIONS: {
  key: CanvasTheme;
  icon: React.ReactNode;
  label: string;
}[] = [
  { key: "light", icon: <Sun size={13} />, label: "Light" },
  { key: "dark", icon: <Moon size={13} />, label: "Dark" },
];

const BRUSH_SHAPES: {
  key: BrushShape;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "circle",
    label: "Circle",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        role="img"
        aria-label="Circle"
      >
        <title>Circle</title>
        <circle cx="6" cy="6" r="5" />
      </svg>
    ),
  },
  {
    key: "square",
    label: "Square",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        role="img"
        aria-label="Square"
      >
        <title>Square</title>
        <rect x="1" y="1" width="10" height="10" />
      </svg>
    ),
  },
  {
    key: "rectangle",
    label: "Rectangle",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        role="img"
        aria-label="Rectangle"
      >
        <title>Rectangle</title>
        <rect x="0" y="3" width="12" height="6" />
      </svg>
    ),
  },
  {
    key: "triangle",
    label: "Triangle",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        role="img"
        aria-label="Triangle"
      >
        <title>Triangle</title>
        <polygon points="6,1 11,11 1,11" />
      </svg>
    ),
  },
  {
    key: "diamond",
    label: "Diamond",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        role="img"
        aria-label="Diamond"
      >
        <title>Diamond</title>
        <polygon points="6,0 12,6 6,12 0,6" />
      </svg>
    ),
  },
  {
    key: "star",
    label: "Star",
    icon: (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        role="img"
        aria-label="Star"
      >
        <title>Star</title>
        <polygon points="6,0.5 7.5,4.5 12,4.5 8.5,7 9.8,11 6,8.5 2.2,11 3.5,7 0,4.5 4.5,4.5" />
      </svg>
    ),
  },
];

export default function Toolbar({
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  brushShape,
  setBrushShape,
  activeTool,
  setActiveTool,
  onClear,
  onUndo,
  onSave,
  strokeCount,
  canvasTheme,
  onThemeChange,
  uiTheme,
  onUiThemeToggle,
  uiAccent,
  pageSizeKey,
  setPageSizeKey,
  pageSize,
}: ToolbarProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const decreaseSize = () => setBrushSize(Math.max(1, brushSize - 2));
  const increaseSize = () => setBrushSize(Math.min(40, brushSize + 2));

  const setColor = (el: HTMLButtonElement, color: string) => {
    el.style.color = color;
  };

  const isPurple = uiTheme === "purple";

  return (
    <TooltipProvider delayDuration={400}>
      <header
        className="flex items-center gap-2 px-3 py-2 select-none flex-wrap transition-colors duration-300"
        style={{
          background: uiAccent.headerBg,
          borderBottom: `1px solid ${uiAccent.headerBorder}`,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
          minHeight: "52px",
        }}
      >
        {/* App name */}
        <div className="flex items-center gap-2 mr-1">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-300"
            style={{
              background: uiAccent.logoBg,
              boxShadow: `0 0 12px ${uiAccent.logoBg}66`,
            }}
          >
            <Paintbrush size={14} className="text-black" />
          </div>
          <span
            className="text-sm font-semibold tracking-tight hidden sm:block"
            style={{ color: "#e8e8ec" }}
          >
            Canvas
          </span>
        </div>

        {/* Divider */}
        <div
          className="w-px h-6 hidden sm:block"
          style={{ background: "#2a2a2e" }}
        />

        {/* Tool buttons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setActiveTool("brush")}
                data-ocid="toolbar.brush.toggle"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  background:
                    activeTool === "brush" ? uiAccent.accentBg : "transparent",
                  color: activeTool === "brush" ? uiAccent.accent : "#a0a0a8",
                  border:
                    activeTool === "brush"
                      ? `1px solid ${uiAccent.accentBorder}`
                      : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (activeTool !== "brush") {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      uiAccent.hoverBg;
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#e8e8ec";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTool !== "brush") {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#a0a0a8";
                  }
                }}
              >
                <Paintbrush size={14} />
                <span className="hidden sm:inline">Brush</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Brush (B)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setActiveTool("eraser")}
                data-ocid="toolbar.eraser.toggle"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  background:
                    activeTool === "eraser" ? uiAccent.accentBg : "transparent",
                  color: activeTool === "eraser" ? uiAccent.accent : "#a0a0a8",
                  border:
                    activeTool === "eraser"
                      ? `1px solid ${uiAccent.accentBorder}`
                      : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (activeTool !== "eraser") {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      uiAccent.hoverBg;
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#e8e8ec";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTool !== "eraser") {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#a0a0a8";
                  }
                }}
              >
                <Eraser size={14} />
                <span className="hidden sm:inline">Eraser</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Eraser (E)</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "#2a2a2e" }} />

        {/* Brush shape picker */}
        <div
          className="flex items-center gap-0.5"
          data-ocid="toolbar.brush_shape.toggle"
        >
          {BRUSH_SHAPES.map(({ key, label, icon }) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setBrushShape(key)}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150"
                  style={{
                    background:
                      brushShape === key ? uiAccent.accentBg : "transparent",
                    color: brushShape === key ? uiAccent.accent : "#6b6b70",
                    border:
                      brushShape === key
                        ? `1px solid ${uiAccent.accentBorder}`
                        : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (brushShape !== key) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        uiAccent.hoverBg;
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#e8e8ec";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (brushShape !== key) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#6b6b70";
                    }
                  }}
                  aria-label={`${label} brush shape`}
                  aria-pressed={brushShape === key}
                >
                  {icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label} brush</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "#2a2a2e" }} />

        {/* Color section */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                className="relative w-7 h-7 rounded-md transition-transform hover:scale-110 active:scale-95"
                style={{
                  background: brushColor,
                  border: "2px solid rgba(255,255,255,0.15)",
                  boxShadow: `0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px ${brushColor}66`,
                }}
                aria-label="Pick color"
              >
                <input
                  ref={colorInputRef}
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  aria-label="Color picker"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Color</TooltipContent>
          </Tooltip>

          <div className="hidden md:flex items-center gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => {
                  setBrushColor(color);
                  if (activeTool === "eraser") setActiveTool("brush");
                }}
                className="w-5 h-5 rounded-full transition-transform hover:scale-125 active:scale-95"
                style={{
                  background: color,
                  border:
                    brushColor === color
                      ? `2px solid ${uiAccent.accent}`
                      : "2px solid rgba(255,255,255,0.1)",
                  boxShadow:
                    brushColor === color ? `0 0 6px ${color}88` : "none",
                }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "#2a2a2e" }} />

        {/* Brush size */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={decreaseSize}
            className="w-6 h-6 rounded flex items-center justify-center transition-colors"
            style={{ color: "#6b6b70" }}
            onMouseEnter={(e) =>
              setColor(e.currentTarget as HTMLButtonElement, "#e8e8ec")
            }
            onMouseLeave={(e) =>
              setColor(e.currentTarget as HTMLButtonElement, "#6b6b70")
            }
            aria-label="Decrease brush size"
          >
            <Minus size={12} />
          </button>

          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min={1}
              max={40}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16 sm:w-24"
              aria-label="Brush size"
            />
            <div className="flex items-center justify-center w-7">
              <div
                className="rounded-full transition-all duration-150"
                style={{
                  width: `${Math.min(brushSize, 24)}px`,
                  height: `${Math.min(brushSize, 24)}px`,
                  background: activeTool === "eraser" ? "#3a3a3e" : brushColor,
                  border:
                    activeTool === "eraser" ? "1px solid #5a5a5e" : "none",
                  boxShadow:
                    activeTool !== "eraser"
                      ? `0 0 6px ${brushColor}66`
                      : "none",
                }}
              />
            </div>
            <span
              className="text-xs w-5 text-right font-mono"
              style={{ color: "#6b6b70" }}
            >
              {brushSize}
            </span>
          </div>

          <button
            type="button"
            onClick={increaseSize}
            className="w-6 h-6 rounded flex items-center justify-center transition-colors"
            style={{ color: "#6b6b70" }}
            onMouseEnter={(e) =>
              setColor(e.currentTarget as HTMLButtonElement, "#e8e8ec")
            }
            onMouseLeave={(e) =>
              setColor(e.currentTarget as HTMLButtonElement, "#6b6b70")
            }
            aria-label="Increase brush size"
          >
            <Circle size={12} />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "#2a2a2e" }} />

        {/* Theme toggle */}
        <div
          className="flex items-center gap-0.5"
          data-ocid="toolbar.theme.toggle"
        >
          {THEME_OPTIONS.map(({ key, icon, label }) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onThemeChange(key)}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150"
                  style={{
                    background:
                      canvasTheme === key ? uiAccent.accentBg : "transparent",
                    color: canvasTheme === key ? uiAccent.accent : "#6b6b70",
                    border:
                      canvasTheme === key
                        ? `1px solid ${uiAccent.accentBorder}`
                        : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (canvasTheme !== key) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        uiAccent.hoverBg;
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#e8e8ec";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canvasTheme !== key) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#6b6b70";
                    }
                  }}
                  aria-label={`${label} canvas theme`}
                  aria-pressed={canvasTheme === key}
                >
                  {icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label} canvas</TooltipContent>
            </Tooltip>
          ))}

          {/* Purple UI theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-ocid="toolbar.purple_theme.toggle"
                onClick={onUiThemeToggle}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 ml-0.5"
                style={{
                  background: isPurple
                    ? "oklch(0.65 0.22 290 / 0.2)"
                    : "transparent",
                  color: isPurple ? "oklch(0.75 0.22 290)" : "#6b6b70",
                  border: isPurple
                    ? "1px solid oklch(0.65 0.22 290 / 0.5)"
                    : "1px solid transparent",
                  boxShadow: isPurple
                    ? "0 0 8px oklch(0.65 0.22 290 / 0.3)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isPurple) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "oklch(0.65 0.22 290 / 0.12)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.75 0.22 290)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPurple) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#6b6b70";
                  }
                }}
                aria-label="Toggle purple UI theme"
                aria-pressed={isPurple}
              >
                <Sparkles size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPurple ? "Disable" : "Enable"} purple theme
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: "#2a2a2e" }} />

        {/* Page size selector */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <FileText size={13} style={{ color: "#6b6b70" }} />
              <Select
                value={pageSizeKey}
                onValueChange={(v) => setPageSizeKey(v as PageSizeKey)}
              >
                <SelectTrigger
                  className="h-7 text-xs border-0 bg-transparent gap-1 px-1.5 min-w-0 w-auto"
                  style={{ color: "#a0a0a8", boxShadow: "none" }}
                  data-ocid="toolbar.page_size.select"
                >
                  <SelectValue>
                    <span style={{ color: "#a0a0a8" }}>
                      {PAGE_SIZE_MAP[pageSizeKey].label}{" "}
                      <span
                        className="hidden lg:inline"
                        style={{ color: "#6b6b70" }}
                      >
                        {pageSize.width}&times;{pageSize.height}
                      </span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAGE_SIZE_MAP) as PageSizeKey[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {PAGE_SIZE_MAP[k].label} &mdash; {PAGE_SIZE_MAP[k].width}
                      &times;{PAGE_SIZE_MAP[k].height}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">Page size</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stroke count */}
        <span className="text-xs hidden lg:block" style={{ color: "#6b6b70" }}>
          {strokeCount} stroke{strokeCount !== 1 ? "s" : ""}
        </span>

        {/* Divider */}
        <div
          className="w-px h-6 hidden lg:block"
          style={{ background: "#2a2a2e" }}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onUndo}
                disabled={strokeCount === 0}
                data-ocid="toolbar.undo.button"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "#a0a0a8" }}
                onMouseEnter={(e) => {
                  if (strokeCount > 0) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      uiAccent.hoverBg;
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#e8e8ec";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#a0a0a8";
                }}
              >
                <Undo2 size={14} />
                <span className="hidden sm:inline">Undo</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Undo last stroke (Ctrl+Z)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onClear}
                disabled={strokeCount === 0}
                data-ocid="toolbar.clear.button"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "#a0a0a8" }}
                onMouseEnter={(e) => {
                  if (strokeCount > 0) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#3a1a1a";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#f87171";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#a0a0a8";
                }}
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear canvas</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onSave}
                data-ocid="toolbar.save.button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ml-1"
                style={{
                  background: uiAccent.saveBg,
                  color: "#0f0f0f",
                  boxShadow: `0 0 12px ${uiAccent.saveBg}4d`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    uiAccent.saveHoverBg;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    `0 0 16px ${uiAccent.saveBg}80`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    uiAccent.saveBg;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    `0 0 12px ${uiAccent.saveBg}4d`;
                }}
              >
                <Download size={14} />
                <span className="hidden sm:inline">Save</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Download as PNG</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
