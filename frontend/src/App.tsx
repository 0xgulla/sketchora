import { Heart } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import CreditModal from "./components/CreditModal";
import DrawingCanvas, {
  type BrushShape,
  type DrawingCanvasHandle,
  type LayerData,
} from "./components/DrawingCanvas";
import FloatingBrushPanel from "./components/FloatingBrushPanel";
import type { LayerFilter } from "./components/LayersPanel";
import type { Layer } from "./components/LayersPanel";
import LeftToolbar, { type DrawingTool } from "./components/LeftToolbar";
import PageBar from "./components/PageBar";
import RightPanel from "./components/RightPanel";
import TopNavBar from "./components/TopNavBar";

export type CanvasTheme = "light" | "dark";
export type ColorTheme = "light" | "dark";
export type UITheme = "default" | "purple";
export type PageSizeKey = "A4" | "A5" | "Letter" | "Square" | "Custom";

export interface PageDimensions {
  width: number;
  height: number;
  label: string;
}

export const PAGE_SIZE_MAP: Record<PageSizeKey, PageDimensions> = {
  A4: { width: 794, height: 1123, label: "A4" },
  A5: { width: 559, height: 794, label: "A5" },
  Letter: { width: 816, height: 1056, label: "Letter" },
  Square: { width: 800, height: 800, label: "Square" },
  Custom: { width: 1200, height: 800, label: "Custom" },
};

export interface UIAccent {
  accent: string;
  accentBg: string;
  accentBorder: string;
  headerBg: string;
  headerBorder: string;
  hoverBg: string;
  logoBg: string;
  saveBg: string;
  saveHoverBg: string;
}

const UI_ACCENT_MAP: Record<UITheme, UIAccent> = {
  default: {
    accent: "oklch(0.72 0.15 200)",
    accentBg: "oklch(0.72 0.15 200 / 0.12)",
    accentBorder: "oklch(0.72 0.15 200 / 0.35)",
    headerBg: "oklch(0.12 0.006 240)",
    headerBorder: "oklch(0.2 0.005 240)",
    hoverBg: "oklch(0.18 0.005 240)",
    logoBg: "oklch(0.72 0.15 200)",
    saveBg: "oklch(0.72 0.15 200)",
    saveHoverBg: "oklch(0.78 0.15 200)",
  },
  purple: {
    accent: "oklch(0.72 0.22 290)",
    accentBg: "oklch(0.65 0.22 290 / 0.15)",
    accentBorder: "oklch(0.65 0.22 290 / 0.35)",
    headerBg: "#0e0a1a",
    headerBorder: "oklch(0.22 0.06 290)",
    hoverBg: "oklch(0.2 0.08 290)",
    logoBg: "oklch(0.65 0.22 290)",
    saveBg: "oklch(0.65 0.22 290)",
    saveHoverBg: "oklch(0.72 0.22 290)",
  },
};

const CANVAS_BG_MAP: Record<CanvasTheme, string> = {
  light: "#ffffff",
  dark: "#1a1a2e",
};

function createDefaultLayer(
  id: number,
): Layer & { strokes: LayerData["strokes"] } {
  return { id, name: `Layer ${id}`, visible: true, opacity: 100, strokes: [] };
}

interface PageLayerState {
  layers: (Layer & { strokes: LayerData["strokes"] })[];
  activeLayerId: number;
}

interface Page {
  id: number;
  name: string;
  layerState: PageLayerState;
}

export default function App() {
  const [brushColor, setBrushColor] = useState("#38bdf8");
  const [brushSize, setBrushSize] = useState(4);
  const [brushShape, setBrushShape] = useState<BrushShape>("circle");
  const [activeTool, setActiveTool] = useState<DrawingTool>("brush");
  const [opacity, setOpacity] = useState(100);
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("dark");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("dark");
  const [pageColor, setPageColor] = useState("#ffffff");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [layerFilters, setLayerFilters] = useState<Record<number, LayerFilter>>(
    {},
  );
  const [layerThumbnails, setLayerThumbnails] = useState<
    Record<number, string>
  >({});
  const [brushSmoothing, setBrushSmoothing] = useState(50);
  const [pressureSim, setPressureSim] = useState(false);
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [uiTheme, setUiTheme] = useState<UITheme>("default");
  const [pageSizeKey, setPageSizeKey] = useState<PageSizeKey>("A4");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState<Page[]>([
    {
      id: 1,
      name: "Page 1",
      layerState: { layers: [createDefaultLayer(1)], activeLayerId: 1 },
    },
  ]);
  const [activePageId, setActivePageId] = useState(1);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [startedPageIds, setStartedPageIds] = useState<Set<number>>(new Set());
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  const canvasBg = pageColor;
  const uiAccent = UI_ACCENT_MAP[uiTheme];
  const pageSize = PAGE_SIZE_MAP[pageSizeKey];

  const activePage = pages.find((p) => p.id === activePageId)!;
  const { layers: activeLayers, activeLayerId } = activePage.layerState;

  const canvasLayers: LayerData[] = activeLayers.map((l) => ({
    id: l.id,
    strokes: l.strokes,
    visible: l.visible,
    opacity: l.opacity,
  }));

  const layerPanelLayers: Layer[] = activeLayers.map((l) => ({
    id: l.id,
    name: l.name,
    visible: l.visible,
    opacity: l.opacity,
  }));

  const activeLayerStrokeCount =
    activeLayers.find((l) => l.id === activeLayerId)?.strokes.length ?? 0;
  const totalStrokeCount = activeLayers.reduce(
    (sum, l) => sum + l.strokes.length,
    0,
  );

  const setActiveLayerId = useCallback(
    (id: number) => {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? { ...p, layerState: { ...p.layerState, activeLayerId: id } }
            : p,
        ),
      );
    },
    [activePageId],
  );

  const handleLayersChange = useCallback(
    (newLayers: LayerData[]) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const mergedLayers = p.layerState.layers.map((l) => {
            const updated = newLayers.find((nl) => nl.id === l.id);
            if (updated) {
              return {
                ...l,
                strokes: updated.strokes,
                visible: updated.visible,
                opacity: updated.opacity,
              };
            }
            return l;
          });
          return {
            ...p,
            layerState: { ...p.layerState, layers: mergedLayers },
          };
        }),
      );
    },
    [activePageId],
  );

  const handleUiThemeToggle = useCallback(() => {
    setUiTheme((prev) => (prev === "default" ? "purple" : "default"));
  }, []);

  const handleThemeChange = useCallback(
    (newTheme: CanvasTheme) => {
      setCanvasTheme(newTheme);
      const newBg = CANVAS_BG_MAP[newTheme];
      const isColorDark = (hex: string) => {
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.25;
      };
      if (
        newBg.startsWith("#") &&
        isColorDark(newBg) &&
        brushColor.startsWith("#") &&
        isColorDark(brushColor)
      ) {
        setBrushColor("#ffffff");
      } else if (
        !isColorDark(newBg.startsWith("#") ? newBg : "#ffffff") &&
        brushColor === "#ffffff"
      ) {
        setBrushColor("#1a1a1a");
      }
    },
    [brushColor],
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      canvasRef.current?.undoStroke();
    }
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const toolKeys: Record<string, DrawingTool> = {
      b: "brush",
      B: "brush",
      e: "eraser",
      E: "eraser",
      s: "shape",
      S: "shape",
      f: "fill",
      F: "fill",
      t: "text",
      T: "text",
      v: "select",
      V: "select",
      i: "colorpicker",
      I: "colorpicker",
      h: "pan",
      H: "pan",
    };
    if (toolKeys[e.key]) setActiveTool(toolKeys[e.key]);
    if (e.key === "]") setBrushSize((s) => Math.min(80, s + 2));
    if (e.key === "[") setBrushSize((s) => Math.max(1, s - 2));
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearCanvas();
  }, []);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undoStroke();
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;
    exportCtx.fillStyle = canvasBg;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `drawing-page${activePageId}-${timestamp}.png`;
    const dataUrl = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activePageId, canvasBg]);

  const handleStartDrawingClick = useCallback(() => {
    setOverlayDismissed(false);
    setShowCreditModal(true);
  }, []);

  const handleModalStartDrawing = useCallback(() => {
    setShowCreditModal(false);
    setOverlayDismissed(true);
    setStartedPageIds((prev) => {
      const next = new Set(prev);
      next.add(activePageId);
      return next;
    });
  }, [activePageId]);

  const handleModalClose = useCallback(() => {
    setShowCreditModal(false);
    setOverlayDismissed(true);
    setStartedPageIds((prev) => {
      const next = new Set(prev);
      next.add(activePageId);
      return next;
    });
  }, [activePageId]);

  const handleRenamePage = useCallback((id: number, newName: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, name: newName.trim() || p.name } : p,
      ),
    );
  }, []);

  const handleAddPage = useCallback(() => {
    setPages((prev) => {
      const newId =
        prev.length > 0 ? Math.max(...prev.map((p) => p.id)) + 1 : 1;
      setActivePageId(newId);
      setOverlayDismissed(false);
      return [
        ...prev,
        {
          id: newId,
          name: `Page ${newId}`,
          layerState: { layers: [createDefaultLayer(1)], activeLayerId: 1 },
        },
      ];
    });
  }, []);

  const handleDeletePage = useCallback(
    (id: number) => {
      setPages((prev) => {
        if (prev.length <= 1) return prev;
        const filtered = prev.filter((p) => p.id !== id);
        if (id === activePageId) {
          const deletedIndex = prev.findIndex((p) => p.id === id);
          const nextPage =
            filtered[Math.min(deletedIndex, filtered.length - 1)];
          setActivePageId(nextPage.id);
        }
        return filtered;
      });
      setStartedPageIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [activePageId],
  );

  const handleLayerFilterChange = useCallback(
    (id: number, filter: Partial<LayerFilter>) => {
      setLayerFilters((prev) => {
        const existing = prev[id] ?? {
          blur: 0,
          brightness: 100,
          contrast: 100,
          opacity: 100,
        };
        return { ...prev, [id]: { ...existing, ...filter } };
      });
    },
    [],
  );

  const handleAddLayer = useCallback(() => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== activePageId) return p;
        const maxId = Math.max(...p.layerState.layers.map((l) => l.id));
        const newLayer = createDefaultLayer(maxId + 1);
        return {
          ...p,
          layerState: {
            layers: [...p.layerState.layers, newLayer],
            activeLayerId: newLayer.id,
          },
        };
      }),
    );
  }, [activePageId]);

  const handleDeleteLayer = useCallback(
    (id: number) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          if (p.layerState.layers.length <= 1) return p;
          const filtered = p.layerState.layers.filter((l) => l.id !== id);
          const newActiveId =
            p.layerState.activeLayerId === id
              ? filtered[filtered.length - 1].id
              : p.layerState.activeLayerId;
          return {
            ...p,
            layerState: { layers: filtered, activeLayerId: newActiveId },
          };
        }),
      );
    },
    [activePageId],
  );

  const handleToggleLayerVisible = useCallback(
    (id: number) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newLayers = p.layerState.layers.map((l) =>
            l.id === id ? { ...l, visible: !l.visible } : l,
          );
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const handleRenameLayer = useCallback(
    (id: number, name: string) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newLayers = p.layerState.layers.map((l) =>
            l.id === id ? { ...l, name: name.trim() || l.name } : l,
          );
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const handleLayerOpacity = useCallback(
    (id: number, opacity: number) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newLayers = p.layerState.layers.map((l) =>
            l.id === id ? { ...l, opacity } : l,
          );
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const handleMoveLayer = useCallback(
    (id: number, direction: "up" | "down") => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const idx = p.layerState.layers.findIndex((l) => l.id === id);
          if (idx < 0) return p;
          const newLayers = [...p.layerState.layers];
          if (direction === "up" && idx < newLayers.length - 1) {
            [newLayers[idx], newLayers[idx + 1]] = [
              newLayers[idx + 1],
              newLayers[idx],
            ];
          } else if (direction === "down" && idx > 0) {
            [newLayers[idx], newLayers[idx - 1]] = [
              newLayers[idx - 1],
              newLayers[idx],
            ];
          }
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const appId = encodeURIComponent(
    typeof window !== "undefined" ? window.location.hostname : "drawing-app",
  );

  const showEmptyHint =
    !overlayDismissed &&
    !startedPageIds.has(activePageId) &&
    totalStrokeCount === 0;

  // Map DrawingTool (which includes "pan") to a tool the canvas understands
  // Canvas doesn't use "pan" – treat it like "select" for drawing purposes
  const canvasTool = activeTool === "pan" ? "select" : activeTool;

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: colorTheme === "light" ? "#e8e8ec" : "#0d0d0f",
        transition: "background 0.4s ease",
      }}
    >
      {showCreditModal && (
        <CreditModal
          onClose={handleModalClose}
          onStartDrawing={handleModalStartDrawing}
        />
      )}

      <TopNavBar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        zoom={zoom}
        onZoomChange={setZoom}
        onUndo={handleUndo}
        canUndo={activeLayerStrokeCount > 0}
        onExport={handleSave}
        uiTheme={uiTheme}
        uiAccent={uiAccent}
        onImportImage={handleImportImage}
        onExportPng={handleExportPng}
        onExportJpg={handleExportJpg}
        brushColor={brushColor}
        onBrushColorChange={setBrushColor}
        colorTheme={colorTheme}
        onColorThemeChange={setColorTheme}
        profileImage={profileImage}
        onProfileImageChange={setProfileImage}
      />

      {showBrushPanel && (
        <FloatingBrushPanel
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          opacity={opacity}
          onOpacityChange={setOpacity}
          brushShape={brushShape}
          onBrushShapeChange={setBrushShape}
          brushSmoothing={brushSmoothing}
          onBrushSmoothingChange={setBrushSmoothing}
          pressureSim={pressureSim}
          onPressureSimChange={setPressureSim}
          accentColor={uiAccent.accent}
          onClose={() => setShowBrushPanel(false)}
        />
      )}

      <div
        style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
      >
        <LeftToolbar
          activeTool={activeTool}
          onToolChange={(tool) => {
            setActiveTool(tool);
            if (tool === "brush") setShowBrushPanel(true);
          }}
          brushColor={brushColor}
          uiTheme={uiTheme}
          uiAccent={uiAccent}
        />

        {/* Canvas workspace */}
        <main
          className="flex-1 flex flex-col overflow-hidden"
          style={{ position: "relative", minWidth: 0 }}
        >
          {/* Dot-grid canvas area */}
          <div
            className="flex-1 canvas-workspace overflow-auto"
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: 40,
            }}
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <DrawingCanvas
                ref={canvasRef}
                brushColor={brushColor}
                brushSize={brushSize}
                brushShape={brushShape}
                activeTool={canvasTool}
                brushOpacity={opacity}
                layers={canvasLayers}
                activeLayerId={activeLayerId}
                onLayersChange={handleLayersChange}
                canvasBg={canvasBg}
                pageSize={pageSize}
                layerFilters={layerFilters}
                onLayerThumbnailUpdate={setLayerThumbnails}
              />
              {showEmptyHint && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ animation: "fade-in 0.6s ease-out" }}
                >
                  <button
                    type="button"
                    className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl cursor-pointer"
                    style={{
                      background: "oklch(0.15 0.006 240 / 0.92)",
                      border: "1px solid oklch(0.25 0.005 240)",
                      backdropFilter: "blur(16px)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                    }}
                    onClick={handleStartDrawingClick}
                    data-ocid="drawing.start_drawing.button"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: uiAccent.accentBg,
                        border: `1px solid ${uiAccent.accentBorder}`,
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={uiAccent.accent}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="img"
                        aria-label="Drawing pencil icon"
                      >
                        <title>Drawing pencil icon</title>
                        <path d="M12 19l7-7 3 3-7 7-3-3z" />
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        <path d="M2 2l7.586 7.586" />
                        <circle cx="11" cy="11" r="2" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "oklch(0.92 0.005 240)" }}
                      >
                        Start Drawing
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "oklch(0.5 0.005 240)" }}
                      >
                        Click and drag to draw &middot;{" "}
                        <kbd
                          className="px-1 py-0.5 rounded text-xs"
                          style={{
                            background: "oklch(0.2 0.005 240)",
                            color: "oklch(0.7 0.005 240)",
                          }}
                        >
                          B
                        </kbd>{" "}
                        brush &middot;{" "}
                        <kbd
                          className="px-1 py-0.5 rounded text-xs"
                          style={{
                            background: "oklch(0.2 0.005 240)",
                            color: "oklch(0.7 0.005 240)",
                          }}
                        >
                          E
                        </kbd>{" "}
                        eraser
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Page bar at bottom */}
          <PageBar
            pages={pages}
            activePageId={activePageId}
            onSelectPage={(id) => {
              setActivePageId(id);
              if (!startedPageIds.has(id)) setOverlayDismissed(false);
            }}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onRenamePage={handleRenamePage}
            uiAccent={uiAccent}
          />
        </main>

        <RightPanel
          layers={layerPanelLayers}
          activeLayerId={activeLayerId}
          onSetActive={setActiveLayerId}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onToggleVisible={handleToggleLayerVisible}
          onRenameLayer={handleRenameLayer}
          onOpacityChange={handleLayerOpacity}
          onMoveLayer={handleMoveLayer}
          brushColor={brushColor}
          onBrushColorChange={setBrushColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          brushShape={brushShape}
          onBrushShapeChange={setBrushShape}
          opacity={opacity}
          onOpacityPropChange={setOpacity}
          canvasTheme={canvasTheme}
          onThemeChange={handleThemeChange}
          uiTheme={uiTheme}
          onUiThemeToggle={handleUiThemeToggle}
          pageSizeKey={pageSizeKey}
          onPageSizeChange={setPageSizeKey}
          onClear={handleClear}
          uiAccent={uiAccent}
          layerFilters={layerFilters}
          onLayerFilterChange={handleLayerFilterChange}
          layerThumbnails={layerThumbnails}
          onDuplicateLayer={handleDuplicateLayer}
          onReorderLayers={handleReorderLayers}
          pageColor={pageColor}
          onPageColorChange={setPageColor}
          onExportPng={handleExportPng}
          onExportJpg={handleExportJpg}
        />
      </div>

      {/* Footer */}
      <footer
        className="flex items-center justify-center gap-1.5 py-1.5 text-xs"
        style={{
          background: uiAccent.headerBg,
          borderTop: `1px solid ${uiAccent.headerBorder}`,
          color: "oklch(0.4 0.005 240)",
          flexShrink: 0,
        }}
      >
        <span>Built with</span>
        <Heart size={10} fill={uiAccent.accent} stroke={uiAccent.accent} />
        <span>using</span>
        <a
          href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors"
          style={{ color: uiAccent.accent }}
        >
          caffeine.ai
        </a>
        <span>&middot; &copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
