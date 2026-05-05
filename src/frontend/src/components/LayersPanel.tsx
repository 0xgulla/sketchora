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
  Lock,
  Move,
  Plus,
  Settings2,
  Trash2,
  Unlock,
} from "lucide-react";
import { useRef, useState } from "react";
import type { UIAccent, UITheme } from "../App";

export interface Layer {
  id: number;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
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
  onLockLayer: (id: number) => void;
  onRenameLayer: (id: number, name: string) => void;
  onOpacityChange: (id: number, opacity: number) => void;
  onMoveLayer: (id: number, direction: "up" | "down") => void;
  onDuplicateLayer: (id: number) => void;
  onReorderLayers: (newOrder: number[]) => void;
  layerFilters: Record<number, LayerFilter>;
  onLayerFilterChange: (id: number, filter: Partial<LayerFilter>) => void;
  thumbnails: Record<number, string>;
  uiTheme: UITheme;
  uiAccent: UIAccent;
  selectedLayerIds?: number[];
  onSelectedLayersChange?: (ids: number[]) => void;
  /** Called when user clicks the Move & Resize icon on a layer row */
  onLayerTransformClick?: (layerId: number) => void;
}

export default function LayersPanel({
  layers,
  activeLayerId,
  onSetActive,
  onAddLayer,
  onDeleteLayer,
  onToggleVisible,
  onLockLayer,
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
  selectedLayerIds = [],
  onSelectedLayersChange,
  onLayerTransformClick,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedFilters, setExpandedFilters] = useState<Set<number>>(
    new Set(),
  );
  const [hoveredLayerId, setHoveredLayerId] = useState<number | null>(null);
  const dragSrcId = useRef<number | null>(null);

  // Ctrl+click multi-select handler
  const handleLayerClick = (id: number, ctrlKey: boolean) => {
    if (ctrlKey && onSelectedLayersChange) {
      const already = selectedLayerIds.includes(id);
      if (already) {
        onSelectedLayersChange(selectedLayerIds.filter((x) => x !== id));
      } else {
        onSelectedLayersChange([...selectedLayerIds, id]);
      }
    } else {
      onSetActive(id);
      if (onSelectedLayersChange) onSelectedLayersChange([id]);
    }
  };

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

  const handleDragStart = (e: React.DragEvent, id: number) => {
    dragSrcId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const srcId = dragSrcId.current;
    if (srcId === null || srcId === targetId) return;
    const revIds = reversedLayers.map((l) => l.id);
    const srcRevIdx = revIds.indexOf(srcId);
    const tgtRevIdx = revIds.indexOf(targetId);
    const newRevIds = [...revIds];
    newRevIds.splice(srcRevIdx, 1);
    newRevIds.splice(tgtRevIdx, 0, srcId);
    onReorderLayers([...newRevIds].reverse());
    dragSrcId.current = null;
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
          background: bg,
        }}
        data-ocid="layers.panel"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 12px 6px",
            borderBottom: `1px solid ${borderColor}`,
            minHeight: 36,
            flexShrink: 0,
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
        </div>

        {/* Layer list - takes all available space */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 0",
            minHeight: 0,
            maxHeight: "calc(100vh - 160px)",
          }}
        >
          {reversedLayers.map((layer, revIdx) => {
            const origIdx = layers.length - 1 - revIdx;
            const isActive = layer.id === activeLayerId;
            const isSelected = selectedLayerIds.includes(layer.id);
            const isFirst = origIdx === layers.length - 1;
            const isLast = origIdx === 0;
            const filtersOpen = expandedFilters.has(layer.id);
            const f = getFilter(layer.id);
            const thumb = thumbnails[layer.id];
            const isLocked = layer.locked;

            return (
              <div
                key={layer.id}
                draggable={!isLocked}
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, layer.id)}
                data-ocid={`layers.item.${layers.length - revIdx}`}
                style={{
                  margin: "2px 6px",
                  borderRadius: 12,
                  borderLeft: isActive
                    ? `3px solid ${accent}`
                    : isSelected
                      ? `3px solid ${accent}66`
                      : "3px solid transparent",
                  outline: isActive
                    ? `1px solid ${accentBorder}`
                    : isSelected
                      ? `1px solid ${accentBorder}66`
                      : "none",
                  background:
                    isSelected && !isActive
                      ? `${accentBg}`
                      : hoveredLayerId === layer.id && !isActive
                        ? "rgba(255,255,255,0.04)"
                        : "transparent",
                  overflow: "hidden",
                  transition: "all 0.15s ease",
                  cursor: "default",
                  opacity: isLocked ? 0.7 : 1,
                }}
                onMouseEnter={() => setHoveredLayerId(layer.id)}
                onMouseLeave={() => setHoveredLayerId(null)}
              >
                {/* Layer row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "5px 6px 3px 4px",
                    cursor: "pointer",
                  }}
                  onClick={(e) =>
                    handleLayerClick(layer.id, e.ctrlKey || e.metaKey)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLayerClick(layer.id, false);
                  }}
                >
                  {/* Drag handle */}
                  <div
                    style={{
                      color: "#3a3a42",
                      cursor: isLocked ? "not-allowed" : "grab",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    data-ocid={`layers.drag_handle.${layers.length - revIdx}`}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical size={12} />
                  </div>

                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 30,
                      height: 22,
                      borderRadius: 4,
                      flexShrink: 0,
                      overflow: "hidden",
                      border: `1px solid ${isActive ? accentBorder : "rgba(255,255,255,0.1)"}`,
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
                    data-ocid={`layers.visibility.toggle.${layers.length - revIdx}`}
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

                  {/* Lock */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLockLayer(layer.id);
                    }}
                    data-ocid={`layers.lock.toggle.${layers.length - revIdx}`}
                    title={isLocked ? "Unlock layer" : "Lock layer"}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background: isLocked
                        ? "rgba(255,180,50,0.15)"
                        : "transparent",
                      color: isLocked ? "#ffb432" : "#4a4a52",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                    aria-label={isLocked ? "Unlock layer" : "Lock layer"}
                  >
                    {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
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
                        fontSize: 11,
                        padding: "2px 5px",
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
                        fontSize: isActive ? 11 : 10,
                        color: isActive ? "#ffffff" : "#a1a1aa",
                        fontWeight: isActive ? 700 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!isLocked) startEdit(layer);
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
                      disabled={isFirst || isLocked}
                      style={{
                        width: 14,
                        height: 13,
                        borderRadius: 2,
                        border: "none",
                        cursor: isFirst || isLocked ? "not-allowed" : "pointer",
                        background: "transparent",
                        color: isFirst || isLocked ? "#2a2a2e" : "#6b6b70",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label="Move layer up"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(layer.id, "down");
                      }}
                      disabled={isLast || isLocked}
                      style={{
                        width: 14,
                        height: 13,
                        borderRadius: 2,
                        border: "none",
                        cursor: isLast || isLocked ? "not-allowed" : "pointer",
                        background: "transparent",
                        color: isLast || isLocked ? "#2a2a2e" : "#6b6b70",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label="Move layer down"
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>

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

                  {/* Move & Resize — visible on hover */}
                  {onLayerTransformClick && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerTransformClick(layer.id);
                          }}
                          data-ocid={`layers.transform.button.${layers.length - revIdx}`}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: "none",
                            cursor: "pointer",
                            background:
                              hoveredLayerId === layer.id
                                ? accentBg
                                : "transparent",
                            color:
                              hoveredLayerId === layer.id
                                ? accent
                                : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.15s",
                            pointerEvents:
                              hoveredLayerId === layer.id ? "all" : "none",
                          }}
                          aria-label="Move & Resize Layer"
                        >
                          <Move size={11} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        Move &amp; Resize Layer
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Opacity slider */}
                <div
                  style={{
                    padding: "0 8px 5px 8px",
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
                    disabled={isLocked}
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
                      padding: "6px 8px 8px",
                      borderTop: `1px solid ${borderColor}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
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
                        label: "Fill",
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

        {/* Bottom controls bar */}
        <div
          style={{
            flexShrink: 0,
            borderTop: `1px solid ${borderColor}`,
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background:
              uiTheme === "purple"
                ? "rgba(14,10,26,0.6)"
                : "rgba(12,12,14,0.6)",
          }}
        >
          {/* Active layer name */}
          {activeLayer && (
            <div
              style={{
                fontSize: 10,
                color: "#6b7280",
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Active:{" "}
              <span style={{ color: accent, fontWeight: 600 }}>
                {activeLayer.name}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onAddLayer}
                  data-ocid="layers.add.button"
                  style={{
                    flex: 1,
                    height: 30,
                    borderRadius: 10,
                    border: `1px solid ${accentBorder}`,
                    cursor: "pointer",
                    background: accentBg,
                    color: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                  aria-label="Add layer"
                >
                  <Plus size={13} />
                  <span>Add</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Add new layer</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() =>
                    activeLayerId && onDuplicateLayer(activeLayerId)
                  }
                  data-ocid="layers.duplicate.bottom.button"
                  style={{
                    flex: 1,
                    height: 30,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.05)",
                    color: "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                  aria-label="Duplicate active layer"
                >
                  <Copy size={12} />
                  <span>Dupe</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Duplicate active layer</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => activeLayerId && onDeleteLayer(activeLayerId)}
                  disabled={layers.length <= 1}
                  data-ocid="layers.delete.bottom.button"
                  style={{
                    flex: 1,
                    height: 30,
                    borderRadius: 10,
                    border: "1px solid rgba(255,80,80,0.2)",
                    cursor: layers.length <= 1 ? "not-allowed" : "pointer",
                    background:
                      layers.length <= 1
                        ? "transparent"
                        : "rgba(255,80,80,0.08)",
                    color: layers.length <= 1 ? "#3a3a42" : "#f87171",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    transition: "all 0.15s",
                    opacity: layers.length <= 1 ? 0.3 : 1,
                  }}
                  aria-label="Delete active layer"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete active layer</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
