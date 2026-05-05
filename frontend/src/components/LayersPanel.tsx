import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import type { UIAccent, UITheme } from "../App";

export interface Layer {
  id: number;
  name: string;
  visible: boolean;
  opacity: number;
}

export interface LayerFilter {
  blur: number;
  brightness: number;
  contrast: number;
  opacity: number;
}

interface LayersPanelProps {
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
  layerFilters: Record<number, LayerFilter>;
  onLayerFilterChange: (id: number, filter: Partial<LayerFilter>) => void;
  thumbnails: Record<number, string>;
  uiTheme: UITheme;
  uiAccent: UIAccent;
}

export default function LayersPanel({
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
  layerFilters,
  onLayerFilterChange,
  thumbnails,
  uiTheme,
  uiAccent,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedFilters, setExpandedFilters] = useState<Set<number>>(
    new Set(),
  );
  const dragFromIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const bg = uiTheme === "purple" ? "#1e1530" : "#1c1c1e";
  const borderColor = uiTheme === "purple" ? "#3a2d5a" : "#2a2a2e";
  const { accent, accentBg, accentBorder } = uiAccent;

  const getFilter = (id: number): LayerFilter =>
    layerFilters[id] ?? {
      blur: 0,
      brightness: 100,
      contrast: 100,
      opacity: 100,
    };

  const reversedLayers = [...layers].reverse();

  const startEdit = (layer: Layer) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const commitEdit = () => {
    if (editingId !== null) {
      onRenameLayer(editingId, editingName);
      setEditingId(null);
    }
  };

  const toggleFilters = (id: number) => {
    setExpandedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, revIdx: number) => {
    dragFromIdx.current = revIdx;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, revIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(revIdx);
  };

  const handleDrop = (e: React.DragEvent, toRevIdx: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (dragFromIdx.current === null || dragFromIdx.current === toRevIdx) return;
    // Convert reversed indices to original indices
    const fromOrig = layers.length - 1 - dragFromIdx.current;
    const toOrig = layers.length - 1 - toRevIdx;
    onReorderLayers(fromOrig, toOrig);
    dragFromIdx.current = null;
  };

  const handleDragEnd = () => {
    setDragOverIdx(null);
    dragFromIdx.current = null;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        style={{
          width: 220,
          background: bg,
          borderLeft: `1px solid ${borderColor}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          zIndex: 10,
          height: "100%",
        }}
        data-ocid="layers.panel"
      >
        {/* Sticky Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderBottom: `1px solid ${borderColor}`,
            minHeight: 40,
            flexShrink: 0,
            position: "sticky" as const,
            top: 0,
            background: bg,
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#a1a1aa",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Layers
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onAddLayer}
                data-ocid="layers.add_button"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: accentBg,
                  color: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  outline: `1px solid ${accentBorder}`,
                }}
                aria-label="Add layer"
              >
                <Plus size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Add Layer</TooltipContent>
          </Tooltip>
        </div>

        {/* Layer list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "6px 0",
            scrollbarWidth: "thin",
            scrollbarColor: "#3a3a4a #141420",
          }}
        >
          {reversedLayers.map((layer, revIdx) => {
            const origIdx = layers.length - 1 - revIdx;
            const isActive = layer.id === activeLayerId;
            const isFirst = origIdx === layers.length - 1;
            const isLast = origIdx === 0;
            const filtersOpen = expandedFilters.has(layer.id);
            const f = getFilter(layer.id);
            const thumb = thumbnails[layer.id];
            const isDragOver = dragOverIdx === revIdx;

            return (
              <div
                key={layer.id}
                data-ocid={`layers.item.${layers.length - revIdx}`}
                draggable
                onDragStart={(e) => handleDragStart(e, revIdx)}
                onDragOver={(e) => handleDragOver(e, revIdx)}
                onDrop={(e) => handleDrop(e, revIdx)}
                onDragEnd={handleDragEnd}
                style={{
                  margin: "2px 6px",
                  borderRadius: 10,
                  background: isActive ? accentBg : "transparent",
                  outline: isDragOver
                    ? `2px dashed ${accent}`
                    : isActive
                      ? `1px solid ${accentBorder}`
                      : "none",
                  overflow: "hidden",
                  transition: "background 0.15s ease, outline 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                }}
              >
                {/* Layer row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "6px 6px 6px 4px",
                    cursor: "pointer",
                  }}
                  onClick={() => onSetActive(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSetActive(layer.id);
                  }}
                >
                  {/* Drag handle */}
                  <div
                    data-ocid={`layers.drag_handle.${layers.length - revIdx}`}
                    style={{
                      color: "#3a3a42",
                      cursor: "grab",
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      padding: "0 1px",
                    }}
                    title="Drag to reorder"
                  >
                    <GripVertical size={12} />
                  </div>

                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 32,
                      height: 24,
                      borderRadius: 4,
                      flexShrink: 0,
                      overflow: "hidden",
                      border: `1px solid ${
                        isActive ? accentBorder : "rgba(255,255,255,0.1)"
                      }`,
                      background: "#fff",
                    }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "rgba(255,255,255,0.05)",
                        }}
                      />
                    )}
                  </div>

                  {/* Visibility */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisible(layer.id);
                    }}
                    data-ocid={`layers.visibility_toggle.${layers.length - revIdx}`}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background: "transparent",
                      color: layer.visible ? accent : "#4a4a52",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-label={layer.visible ? "Hide layer" : "Show layer"}
                  >
                    {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>

                  {/* Name */}
                  {editingId === layer.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditingId(null);
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      data-ocid="layers.name.input"
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${accent}`,
                        borderRadius: 4,
                        color: "#e4e4e7",
                        fontSize: 10,
                        padding: "2px 4px",
                        outline: "none",
                        minWidth: 0,
                      }}
                      // biome-ignore lint/a11y/noAutofocus: intentional
                      autoFocus
                    />
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        fontSize: 10,
                        color: isActive ? accent : "#a1a1aa",
                        fontWeight: isActive ? 600 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEdit(layer);
                      }}
                      title="Double-click to rename"
                    >
                      {layer.name}
                    </span>
                  )}

                  {/* Reorder arrows */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(layer.id, "up");
                      }}
                      disabled={isFirst}
                      style={{
                        width: 13,
                        height: 12,
                        borderRadius: 2,
                        border: "none",
                        cursor: isFirst ? "not-allowed" : "pointer",
                        background: "transparent",
                        color: isFirst ? "#2a2a2e" : "#6b6b70",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label="Move layer up"
                    >
                      <ChevronUp size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(layer.id, "down");
                      }}
                      disabled={isLast}
                      style={{
                        width: 13,
                        height: 12,
                        borderRadius: 2,
                        border: "none",
                        cursor: isLast ? "not-allowed" : "pointer",
                        background: "transparent",
                        color: isLast ? "#2a2a2e" : "#6b6b70",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label="Move layer down"
                    >
                      <ChevronDown size={10} />
                    </button>
                  </div>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateLayer(layer.id);
                    }}
                    data-ocid={`layers.duplicate_button.${layers.length - revIdx}`}
                    title="Duplicate layer"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background: "transparent",
                      color: "#6b6b70",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-label="Duplicate layer"
                  >
                    <Copy size={11} />
                  </button>

                  {/* Filter toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilters(layer.id);
                    }}
                    data-ocid={`layers.filter_toggle.button.${layers.length - revIdx}`}
                    title="Layer filters"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background: filtersOpen ? accentBg : "transparent",
                      color: filtersOpen ? accent : "#6b6b70",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    <Settings2 size={11} />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    disabled={layers.length <= 1}
                    data-ocid={`layers.delete_button.${layers.length - revIdx}`}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: "none",
                      cursor: layers.length <= 1 ? "not-allowed" : "pointer",
                      background: "transparent",
                      color: layers.length <= 1 ? "#2a2a2e" : "#6b6b70",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      opacity: layers.length <= 1 ? 0.3 : 1,
                    }}
                    aria-label="Delete layer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                {/* Opacity slider */}
                <div
                  style={{
                    padding: "0 8px 6px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: "#6b6b70",
                      minWidth: 32,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Opacity
                  </span>
                  <Slider
                    value={[layer.opacity]}
                    min={0}
                    max={100}
                    onValueChange={([v]) => onOpacityChange(layer.id, v)}
                    className="flex-1"
                    data-ocid={`layers.opacity.input.${layers.length - revIdx}`}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: "#a1a1aa",
                      minWidth: 24,
                      textAlign: "right",
                    }}
                  >
                    {layer.opacity}%
                  </span>
                </div>

                {/* Filter sliders */}
                {filtersOpen && (
                  <div
                    style={{
                      padding: "6px 8px 10px",
                      borderTop: `1px solid ${borderColor}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      animation: "float-in 0.18s ease-out",
                    }}
                  >
                    {[
                      {
                        key: "blur" as const,
                        label: "Blur",
                        min: 0,
                        max: 20,
                        unit: "px",
                        val: f.blur,
                      },
                      {
                        key: "brightness" as const,
                        label: "Bright",
                        min: 0,
                        max: 200,
                        unit: "%",
                        val: f.brightness,
                      },
                      {
                        key: "contrast" as const,
                        label: "Contrast",
                        min: 0,
                        max: 200,
                        unit: "%",
                        val: f.contrast,
                      },
                      {
                        key: "opacity" as const,
                        label: "Fill Opacity",
                        min: 0,
                        max: 100,
                        unit: "%",
                        val: f.opacity,
                      },
                    ].map(({ key, label, min, max, unit, val }) => (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            color: "#6b6b70",
                            minWidth: 44,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {label}
                        </span>
                        <Slider
                          value={[val]}
                          min={min}
                          max={max}
                          onValueChange={([v]) =>
                            onLayerFilterChange(layer.id, { [key]: v })
                          }
                          className="flex-1"
                          data-ocid={`layers.filter.${key}.input`}
                        />
                        <span
                          style={{
                            fontSize: 10,
                            color: "#a1a1aa",
                            minWidth: 28,
                            textAlign: "right",
                          }}
                        >
                          {val}
                          {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </TooltipProvider>
  );
}
