import { ChevronRight, Layers } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import type { UIAccent, UITheme } from "../App";
import type { BrushShape } from "./DrawingCanvas";
import LayersPanel, { type Layer, type LayerFilter } from "./LayersPanel";

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
  onReorderLayers: (newOrder: number[]) => void;
  onLockLayer: (id: number) => void;
  brushColor: string;
  onBrushColorChange: (c: string) => void;
  brushSize: number;
  onBrushSizeChange: (s: number) => void;
  brushShape: BrushShape;
  onBrushShapeChange: (s: BrushShape) => void;
  opacity: number;
  onOpacityPropChange: (o: number) => void;
  canvasTheme: string;
  onThemeChange: (t: import("../App").CanvasTheme) => void;
  uiTheme: UITheme;
  onUiThemeToggle: () => void;
  pageSizeKey: string;
  onPageSizeChange: (k: import("../App").PageSizeKey) => void;
  onClear: () => void;
  uiAccent: UIAccent;
  layerFilters?: Record<number, LayerFilter>;
  onLayerFilterChange?: (id: number, filter: Partial<LayerFilter>) => void;
  layerThumbnails?: Record<number, string>;
  /** Multi-layer selection for the transform tool */
  selectedLayerIds?: number[];
  onSelectedLayersChange?: (ids: number[]) => void;
  /** Whether the layers panel is open */
  isVisible?: boolean;
  /** Toggle open/close */
  onTogglePanelVisible?: () => void;
  /** Called when user clicks the Move & Resize icon on a layer row */
  onLayerTransformClick?: (layerId: number) => void;
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
  onLockLayer,
  uiTheme,
  uiAccent,
  layerFilters = {},
  onLayerFilterChange,
  layerThumbnails = {},
  isVisible = true,
  onTogglePanelVisible,
  selectedLayerIds,
  onSelectedLayersChange,
  onLayerTransformClick,
}: RightPanelProps) {
  const panelBg = uiTheme === "purple" ? "#0e0a1a" : "oklch(0.11 0.006 240)";
  const panelBorder =
    uiTheme === "purple" ? "oklch(0.22 0.06 290)" : "oklch(0.2 0.005 240)";
  const accentColor = uiAccent.accent;
  const accentBg = uiAccent.accentBg;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        flexShrink: 0,
      }}
    >
      {/* Toggle tab — always visible, positioned at left edge */}
      <motion.button
        data-ocid="rightpanel.toggle"
        type="button"
        aria-label={
          isVisible ? "Hide Layers Panel (L)" : "Show Layers Panel (L)"
        }
        title={isVisible ? "Hide Layers (L)" : "Show Layers (L)"}
        onClick={onTogglePanelVisible}
        initial={false}
        animate={{ x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        style={{
          position: "absolute",
          left: -32,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
          width: 32,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 4,
          background: panelBg,
          border: `1px solid ${panelBorder}`,
          borderRight: "none",
          borderRadius: "10px 0 0 10px",
          cursor: "pointer",
          color: accentColor,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: isVisible
            ? "-4px 0 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
            : `${"−6px 0 28px rgba(0,0,0,0.55), 0 0 20px "}${accentBg}`,
          transition: "background 0.2s ease, box-shadow 0.3s ease",
          padding: 0,
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            uiTheme === "purple"
              ? "rgba(168,85,247,0.18)"
              : "oklch(0.17 0.006 240)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            `${"−4px 0 20px rgba(0,0,0,0.4), 0 0 24px "}${accentBg}`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = panelBg;
          (e.currentTarget as HTMLButtonElement).style.boxShadow = isVisible
            ? "-4px 0 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
            : `${"−6px 0 28px rgba(0,0,0,0.55), 0 0 20px "}${accentBg}`;
        }}
      >
        {/* Vertical "LAYERS" label — only when closed */}
        <AnimatePresence>
          {!isVisible && (
            <motion.span
              key="label"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: accentColor,
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                lineHeight: 1,
                display: "block",
              }}
            >
              Layers
            </motion.span>
          )}
        </AnimatePresence>

        <Layers
          size={isVisible ? 13 : 14}
          strokeWidth={2}
          style={{ flexShrink: 0 }}
        />

        <motion.div
          animate={{ rotate: isVisible ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronRight size={11} strokeWidth={2.5} />
        </motion.div>
      </motion.button>

      {/* Sliding panel wrapper — motion.div spring slide */}
      <motion.aside
        data-ocid="rightpanel.panel"
        initial={false}
        animate={{
          width: isVisible ? 240 : 0,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          width: { type: "spring", stiffness: 340, damping: 34, mass: 0.9 },
          opacity: { duration: 0.22, ease: "easeInOut" },
        }}
        style={{
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          background: panelBg,
          borderLeft: `1px solid ${panelBorder}`,
          zIndex: 40,
          boxShadow: isVisible ? "-4px 0 24px rgba(0,0,0,0.4)" : "none",
          pointerEvents: isVisible ? "auto" : "none",
          position: "relative",
        }}
      >
        {/* Subtle top accent glow line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        <div
          style={{
            width: 240,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              paddingLeft: 14,
              paddingRight: 8,
              borderBottom: `1px solid ${panelBorder}`,
              flexShrink: 0,
              gap: 8,
              background: `linear-gradient(180deg, ${panelBg} 0%, transparent 100%)`,
            }}
          >
            <Layers size={13} color={accentColor} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: accentColor,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                flex: 1,
              }}
            >
              Layers
            </span>
            {/* Close button inside header */}
            <motion.button
              type="button"
              aria-label="Close layers panel"
              onClick={onTogglePanelVisible}
              whileHover={{ scale: 1.15, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 6,
                opacity: 0.65,
                padding: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                (e.currentTarget as HTMLButtonElement).style.background =
                  accentBg;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.65";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
            >
              <ChevronRight size={13} strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Layers content */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
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
              onLockLayer={onLockLayer}
              layerFilters={layerFilters}
              onLayerFilterChange={onLayerFilterChange ?? (() => {})}
              thumbnails={layerThumbnails}
              uiTheme={uiTheme}
              uiAccent={uiAccent}
              selectedLayerIds={selectedLayerIds}
              onSelectedLayersChange={onSelectedLayersChange}
              onLayerTransformClick={onLayerTransformClick}
            />
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

// Keep type re-exports so other files that import from RightPanel still compile
export type { Layer, LayerFilter };
