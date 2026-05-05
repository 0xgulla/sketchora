import { Heart, Layers, PanelRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AIAssistantPanel from "./components/AIAssistantPanel";
import AppLoadingScreen from "./components/AppLoadingScreen";
import CanvasDashboard from "./components/CanvasDashboard";
import CreditModal from "./components/CreditModal";
import DrawingCanvas, {
  type BrushShape,
  type DrawingCanvasHandle,
  type LayerData,
  type LayerFilterData,
} from "./components/DrawingCanvas";
import type { VectorShapeType } from "./components/DrawingCanvas";
import type { Stroke } from "./components/DrawingCanvas";
import FloatingBrushPanel from "./components/FloatingBrushPanel";
import FloatingEraserPanel from "./components/FloatingEraserPanel";
import FloatingSettingsModal from "./components/FloatingSettingsModal";
import FloatingShapePanel from "./components/FloatingShapePanel";
import FloatingTextPanel from "./components/FloatingTextPanel";
import type { TextOptions } from "./components/FloatingTextPanel";
import LandingPage from "./components/LandingPage";
import type { Layer, LayerFilter } from "./components/LayersPanel";
import LeftToolbar, { type DrawingTool } from "./components/LeftToolbar";
import type { CanvasConfig } from "./components/NewCanvasModal";
import PageBar from "./components/PageBar";
import PageTransitionLoader from "./components/PageTransitionLoader";
import RightPanel from "./components/RightPanel";
import SelectionOverlay from "./components/SelectionOverlay";
import TopNavBar from "./components/TopNavBar";
import TransformOverlay from "./components/TransformOverlay";
import TransformPanel from "./components/TransformPanel";
import TransformToolPanel from "./components/TransformToolPanel";
import UserGuidePage from "./components/UserGuidePage";
import { useWeb3Auth } from "./hooks/useWeb3Auth";
import type { TransformState } from "./lib/TransformTool";
import {
  type PartialStrokeSelection,
  type VectorTransformState,
  VectorTransformTool,
} from "./lib/TransformTool";
import { checkPaidAccess } from "./lib/usdcPayment";
import { getPointIndicesInBox } from "./utils/transformEngine";

export type CanvasTheme = "light" | "dark";
export type ColorTheme = "light" | "dark" | "purple";
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
  Square: { width: 1024, height: 1024, label: "Square" },
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

const _CANVAS_BG_MAP: Record<CanvasTheme, string> = {
  light: "#ffffff",
  dark: "#1a1a2e",
};

type FullLayer = Layer & { strokes: LayerData["strokes"] };

/**
 * Scan ImageData for the tight bounding box of all non-transparent pixels.
 * Returns null if the layer is entirely empty.
 * All returned coords are in logical CSS pixels (divided by dpr).
 */
function computeLayerContentBounds(
  data: ImageData,
  physicalW: number,
  physicalH: number,
  dpr: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const pixels = data.data;
  let minX = physicalW;
  let minY = physicalH;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let py = 0; py < physicalH; py++) {
    for (let px = 0; px < physicalW; px++) {
      const alpha = pixels[(py * physicalW + px) * 4 + 3];
      if (alpha > 0) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        found = true;
      }
    }
  }
  if (!found) return null;
  return {
    minX: minX / dpr,
    minY: minY / dpr,
    maxX: (maxX + 1) / dpr,
    maxY: (maxY + 1) / dpr,
  };
}

function createDefaultLayer(id: number): FullLayer {
  return {
    id,
    name: `Layer ${id}`,
    visible: true,
    opacity: 100,
    locked: false,
    strokes: [],
  };
}

function createDefaultPage(pageId: number) {
  return {
    id: pageId,
    name: `Page ${pageId}`,
    layers: [createDefaultLayer(1)],
    activeLayerId: 1,
    canvasSize: PAGE_SIZE_MAP.Square,
    pageColor: "transparent",
    thumbnail: undefined as string | undefined,
  };
}

/** Merge DrawingCanvas LayerData updates back into our FullLayer array */
function mergeLayerData(
  current: FullLayer[],
  updated: LayerData[],
): FullLayer[] {
  return current.map((l) => {
    const u = updated.find((ul) => ul.id === l.id);
    if (!u) return l;
    return { ...l, strokes: u.strokes, visible: u.visible, opacity: u.opacity };
  });
}

export interface AppProps {
  onGoHome?: () => void;
  web3WalletAddress?: string | null;
  web3EnsName?: string | null;
  isWeb3Auth?: boolean;
  /**
   * When Root.tsx renders <App> directly for the /draw route, it should
   * pass initialView="app" so the canvas is immediately visible instead of
   * showing the internal landing page.
   */
  initialView?: "landing" | "app" | "guide";
  /**
   * Canvas config chosen in NewCanvasModal before navigating.
   * When provided, CanvasDashboard is skipped and the canvas initialises
   * with this size/background directly.
   */
  initialCanvasConfig?: CanvasConfig;
}

export default function App({
  onGoHome,
  web3WalletAddress,
  web3EnsName,
  isWeb3Auth,
  initialView = "app",
  initialCanvasConfig,
}: AppProps = {}) {
  void web3EnsName; // will be used in future TopNavBar integration
  void isWeb3Auth;
  // ─── Navigation ───────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<"landing" | "app" | "guide">(
    initialView,
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigateWithLoader = useCallback(
    (view: "landing" | "app" | "guide") => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentView(view);
        setIsTransitioning(false);
        // Show app loading screen the first time entering the draw view per session
        if (view === "app") {
          const alreadySeen = sessionStorage.getItem("sketchora_loaded");
          if (!alreadySeen) {
            setShowAppLoader(true);
          }
          // Show canvas dashboard once per session
          const dashboardShown = sessionStorage.getItem(
            "sketchora-dashboard-shown",
          );
          if (!dashboardShown) {
            setShowDashboard(true);
          }
        }
      }, 2300);
    },
    [],
  );

  // ─── Page / Layer state ───────────────────────────────────────────────
  const [pages, setPages] = useState(() => [createDefaultPage(1)]);
  const [activePageId, setActivePageId] = useState(1);
  const [layers, setLayers] = useState<FullLayer[]>(() => [
    createDefaultLayer(1),
  ]);
  const [activeLayerId, setActiveLayerId] = useState<number>(1);
  const [selectedLayerIds, setSelectedLayerIds] = useState<number[]>([1]);
  const [pageSizeKey, setPageSizeKey] = useState<PageSizeKey>("Square");
  const [pageColor, setPageColor] = useState("#ffffff");
  const [layerThumbnails, setLayerThumbnails] = useState<
    Record<number, string>
  >({});

  const saveLayersToPage = useCallback(
    (newLayers: FullLayer[]) => {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? { ...p, layers: newLayers, activeLayerId }
            : p,
        ),
      );
    },
    [activePageId, activeLayerId],
  );

  useEffect(() => {
    const page = pages.find((p) => p.id === activePageId);
    if (page) {
      setLayers(page.layers);
      setActiveLayerId(page.activeLayerId);
    }
    // Clear undo/redo history when page changes
    setUndoStack([]);
    setRedoStack([]);
  }, [activePageId, pages]);

  // ─── Tool state ────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<DrawingTool>("brush");
  const [brushColor, setBrushColor] = useState("#a855f7");
  const [brushSize, setBrushSize] = useState(8);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushHardness, setBrushHardness] = useState(100);
  const [brushShape, setBrushShape] = useState<BrushShape>("circle");
  const [brushSmoothing, setBrushSmoothing] = useState(50);
  const [pressureSim, setPressureSim] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [eraserSoftness, setEraserSoftness] = useState<"hard" | "soft">("hard");
  const [fillTolerance, setFillTolerance] = useState(32);
  // expose setFillTolerance for future ToolSettingsPanel wiring
  void setFillTolerance;

  // ─── Legacy raster transform state ────────────────────────────────────
  const [transformState, setTransformState] = useState<TransformState | null>(
    null,
  );
  const [transformActive, setTransformActive] = useState(false);

  // ─── Vector transform state ───────────────────────────────────────────
  const [vectorTransformActive, setVectorTransformActive] = useState(false);
  const [vectorTransformState, setVectorTransformState] =
    useState<VectorTransformState | null>(null);
  // previewStrokes tracks the live-transformed strokes for the active VTT frame
  // (set via setLayerStrokes for immediate canvas preview — stored for future consumers)
  const [_previewStrokes, setPreviewStrokes] = useState<Stroke[] | null>(null);
  void _previewStrokes;

  // Marquee selection drawn before VTT activates
  const [marqueeSelection, setMarqueeSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  /** Stores the original strokes snapshot so cancel can restore them. */
  const originalStrokesRef = useRef<Stroke[] | null>(null);
  /** Active VectorTransformTool instance. */
  const vttRef = useRef<VectorTransformTool | null>(null);
  /** Reference to the overlay canvas element (forwarded from TransformOverlay). */
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Marquee drawing state refs (screen-space, not canvas-space)
  const marqueeDrawingRef = useRef(false);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);

  const [zoom, setZoom] = useState(100);
  const [shapeType, setShapeType] = useState<VectorShapeType>("rect");
  const [colorHistory, setColorHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("colorHistory") ?? "[]");
    } catch {
      return [];
    }
  });

  // ─── Text tool ─────────────────────────────────────────────────────────
  const [textClickPos, setTextClickPos] = useState<{
    canvasX: number;
    canvasY: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // ─── Selection rect (shared between canvas and overlay) ────────────────
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // ─── Theme ─────────────────────────────────────────────────────────────
  const [colorTheme, setColorTheme] = useState<ColorTheme>(
    () => (localStorage.getItem("colorTheme") as ColorTheme) ?? "dark",
  );
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>(
    () => (localStorage.getItem("canvasTheme") as CanvasTheme) ?? "dark",
  );
  const uiTheme: UITheme = colorTheme === "purple" ? "purple" : "default";
  const uiAccent = UI_ACCENT_MAP[uiTheme];

  useEffect(() => {
    localStorage.setItem("colorTheme", colorTheme);
    localStorage.setItem("canvasTheme", canvasTheme);
  }, [colorTheme, canvasTheme]);

  const handleColorThemeChange = useCallback((theme: ColorTheme) => {
    setColorTheme(theme);
  }, []);

  const handleUiThemeToggle = useCallback(() => {
    setColorTheme((prev) => (prev === "purple" ? "dark" : "purple"));
  }, []);

  // ─── Profile ───────────────────────────────────────────────────────────
  const [profileImage, setProfileImage] = useState<string | null>(() =>
    localStorage.getItem("profileImage"),
  );

  // ─── Panel visibility ──────────────────────────────────────────────────
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [showEraserPanel, setShowEraserPanel] = useState(false);
  const [showShapePanel, setShowShapePanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // ─── Keyboard shortcut: L = toggle layer panel ─────────────────────────
  useEffect(() => {
    if (currentView !== "app") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isTyping) return;
      if (e.key === "l" || e.key === "L") {
        setShowLayerPanel((v) => !v);
      }
      // Alt+A = toggle AI panel
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setShowAIPanel((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentView]);

  // ─── App loading screen ───────────────────────────────────────────────
  const [showAppLoader, setShowAppLoader] = useState(false);

  // ─── Canvas dashboard (shown once per session when entering app) ──────
  // Skip the dashboard if a canvas config was already selected in the landing modal
  const [showDashboard, setShowDashboard] = useState(false);
  const initialCanvasConfigRef = useRef(initialCanvasConfig);
  const [customCanvasSize, setCustomCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(() => {
    if (initialCanvasConfig) {
      return {
        width: initialCanvasConfig.width,
        height: initialCanvasConfig.height,
      };
    }
    return null;
  });

  // Apply initialCanvasConfig on first mount — sets size + marks dashboard as shown
  useEffect(() => {
    const cfg = initialCanvasConfigRef.current;
    if (!cfg) return;
    setCustomCanvasSize({ width: cfg.width, height: cfg.height });
    setPageSizeKey("Custom");
    if (cfg.background && cfg.background !== "transparent") {
      setPageColor(cfg.background);
    } else if (cfg.background === "transparent") {
      setPageColor("transparent");
    }
    // Mark dashboard as shown so it doesn't appear over the canvas
    sessionStorage.setItem("sketchora-dashboard-shown", "1");
  }, []);

  // ─── Canvas ref ────────────────────────────────────────────────────────
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  // ─── Pan (hand tool) ──────────────────────────────────────────────────
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // ─── Eyedropper hover preview ─────────────────────────────────────────
  const [eyedropperPreview, setEyedropperPreview] = useState<{
    color: string;
    x: number;
    y: number;
  } | null>(null);

  // ─── Undo / Redo ───────────────────────────────────────────────────────
  const [undoStack, setUndoStack] = useState<FullLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<FullLayer[][]>([]);

  const pushUndo = useCallback((snapshot: FullLayer[]) => {
    setUndoStack((prev) => [...prev.slice(-50), snapshot]);
    setRedoStack([]);
  }, []);

  // Called by DrawingCanvas just BEFORE committing a stroke — saves pre-stroke state
  const handleStrokeEnd = useCallback((preStrokeSnapshot: LayerData[]) => {
    // Convert LayerData[] to FullLayer[] for history
    setLayers((currentLayers) => {
      const snapshot = currentLayers.map((l) => {
        const sd = preStrokeSnapshot.find((d) => d.id === l.id);
        if (!sd) return l;
        return {
          ...l,
          strokes: sd.strokes,
          visible: sd.visible,
          opacity: sd.opacity,
        };
      });
      setUndoStack((prev) => {
        const next = [...prev, snapshot];
        if (next.length > 50) next.shift();
        return next;
      });
      setRedoStack([]);
      return currentLayers; // don't change layers, just save snapshot
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, layers]);
      setLayers(last);
      saveLayersToPage(last);
      return prev.slice(0, -1);
    });
  }, [layers, saveLayersToPage]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[prev.length - 1];
      setUndoStack((u) => [...u, layers]);
      setLayers(next);
      saveLayersToPage(next);
      return prev.slice(0, -1);
    });
  }, [layers, saveLayersToPage]);

  // ─── Color history ─────────────────────────────────────────────────────
  const addColorToHistory = useCallback((color: string) => {
    setColorHistory((prev) => {
      const filtered = prev.filter((c) => c !== color);
      const next = [color, ...filtered].slice(0, 30);
      localStorage.setItem("colorHistory", JSON.stringify(next));
      return next;
    });
  }, []);

  // ─── Layer management ─────────────────────────────────────────────────
  const [layerFilters, setLayerFilters] = useState<Record<number, LayerFilter>>(
    {},
  );

  // Called by DrawingCanvas when strokes change (LayerData[] — no name/locked)
  const handleLayersChange = useCallback(
    (newLayerData: LayerData[]) => {
      setLayers((prev) => {
        const merged = mergeLayerData(prev, newLayerData);
        saveLayersToPage(merged);
        return merged;
      });
    },
    [saveLayersToPage],
  );

  const handleLayerFilterChange = useCallback(
    (id: number, filter: Partial<LayerFilter>) => {
      const defaults: LayerFilter = {
        blur: 0,
        brightness: 100,
        contrast: 100,
        opacity: 100,
      };
      setLayerFilters((prev) => ({
        ...prev,
        [id]: { ...defaults, ...prev[id], ...filter } as LayerFilter,
      }));
    },
    [],
  );

  const handleAddLayer = useCallback(() => {
    setLayers((prev) => {
      const newId = Math.max(...prev.map((l) => l.id), 0) + 1;
      const newLayer = createDefaultLayer(newId);
      const next = [...prev, newLayer];
      saveLayersToPage(next);
      setActiveLayerId(newId);
      return next;
    });
  }, [saveLayersToPage]);

  const handleDeleteLayer = useCallback(
    (id: number) => {
      setLayers((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((l) => l.id !== id);
        saveLayersToPage(next);
        if (activeLayerId === id) setActiveLayerId(next[next.length - 1].id);
        return next;
      });
    },
    [activeLayerId, saveLayersToPage],
  );

  const handleToggleVisible = useCallback(
    (id: number) => {
      setLayers((prev) => {
        const next = prev.map((l) =>
          l.id === id ? { ...l, visible: !l.visible } : l,
        );
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleRenameLayer = useCallback(
    (id: number, name: string) => {
      setLayers((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, name } : l));
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleLayerOpacityChange = useCallback(
    (id: number, opacity: number) => {
      setLayers((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, opacity } : l));
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleMoveLayer = useCallback(
    (id: number, direction: "up" | "down") => {
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        const swap = direction === "up" ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= next.length) return prev;
        [next[idx], next[swap]] = [next[swap], next[idx]];
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleDuplicateLayer = useCallback(
    (id: number) => {
      setLayers((prev) => {
        const src = prev.find((l) => l.id === id);
        if (!src) return prev;
        const newId = Math.max(...prev.map((l) => l.id), 0) + 1;
        const copy = {
          ...src,
          id: newId,
          name: `${src.name} Copy`,
          strokes: [...src.strokes],
        };
        const idx = prev.findIndex((l) => l.id === id);
        const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
        saveLayersToPage(next);
        setActiveLayerId(newId);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleReorderLayers = useCallback(
    (newOrder: number[]) => {
      setLayers((prev) => {
        const map = new Map(prev.map((l) => [l.id, l]));
        const next = newOrder
          .map((id) => map.get(id))
          .filter(Boolean) as FullLayer[];
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleLockLayer = useCallback(
    (id: number) => {
      setLayers((prev) => {
        const next = prev.map((l) =>
          l.id === id ? { ...l, locked: !l.locked } : l,
        );
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  // ─── Page management ──────────────────────────────────────────────────
  const handleAddPage = useCallback(() => {
    const newId = Math.max(...pages.map((p) => p.id), 0) + 1;
    setPages((prev) => [...prev, createDefaultPage(newId)]);
    setActivePageId(newId);
    setPanOffset({ x: 0, y: 0 });
  }, [pages]);

  const handleDeletePage = useCallback(
    (pageId: number) => {
      if (pages.length <= 1) return;
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      if (activePageId === pageId) {
        const remaining = pages.filter((p) => p.id !== pageId);
        setActivePageId(remaining[0].id);
      }
    },
    [pages, activePageId],
  );

  const handleRenamePage = useCallback((pageId: number, name: string) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, name } : p)));
  }, []);

  const handleDuplicatePage = useCallback(
    (pageId: number) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const newId = Math.max(...pages.map((p) => p.id), 0) + 1;
      setPages((prev) => [
        ...prev,
        {
          ...page,
          id: newId,
          name: `${page.name} Copy`,
          layers: page.layers.map((l) => ({ ...l, strokes: [...l.strokes] })),
        },
      ]);
      setActivePageId(newId);
    },
    [pages],
  );

  const handleSelectPage = useCallback(
    (pageId: number) => {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId ? { ...p, layers, activeLayerId } : p,
        ),
      );
      setActivePageId(pageId);
    },
    [activePageId, layers, activeLayerId],
  );

  // ─── New project ──────────────────────────────────────────────────────
  const handleNewProject = useCallback(() => {
    const fresh = [createDefaultPage(1)];
    setPages(fresh);
    setActivePageId(1);
    setLayers([createDefaultLayer(1)]);
    setActiveLayerId(1);
    setUndoStack([]);
    setRedoStack([]);
    setPanOffset({ x: 0, y: 0 });
    canvasRef.current?.clearCanvas();
  }, []);

  // ─── Save / Export ────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "sketchora-export.png";
    a.click();
  }, []);

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.href = tmp.toDataURL("image/png");
    a.download = "sketchora.png";
    a.click();
  }, []);

  const handleExportJPG = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.href = tmp.toDataURL("image/jpeg", 0.92);
    a.download = "sketchora.jpg";
    a.click();
  }, []);

  const handleSaveDrw = useCallback(() => {
    const data = JSON.stringify({
      pages,
      activePageId,
      pageSizeKey,
      pageColor,
      colorTheme,
    });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sketchora-project.drw";
    a.click();
    URL.revokeObjectURL(url);
  }, [pages, activePageId, pageSizeKey, pageColor, colorTheme]);

  const handleSaveAs = useCallback(() => {
    const name =
      prompt("File name:", "sketchora-project") ?? "sketchora-project";
    const data = JSON.stringify({
      pages,
      activePageId,
      pageSizeKey,
      pageColor,
      colorTheme,
    });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.drw`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pages, activePageId, pageSizeKey, pageColor, colorTheme]);

  const handleImportImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height,
          1,
        );
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        canvasRef.current?.bakeToFlatLayer?.();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearCanvas = useCallback(() => {
    pushUndo(layers);
    canvasRef.current?.clearCanvas();
  }, [layers, pushUndo]);

  // ─── AI: insert generated image as a new layer ────────────────────────
  const handleInsertAIImageLayer = useCallback(
    (imageUrl: string) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Add a new layer for the AI image
        setLayers((prev) => {
          const newId = Math.max(...prev.map((l) => l.id), 0) + 1;
          const newLayer = createDefaultLayer(newId);
          newLayer.name = "AI Generated";
          const next = [...prev, newLayer];
          saveLayersToPage(next);
          setActiveLayerId(newId);

          // Draw image onto the new layer after next tick
          setTimeout(() => {
            const canvas = canvasRef.current?.getCanvas();
            if (!canvas) return;
            const layerCanvas = document.createElement("canvas");
            layerCanvas.width = canvas.width;
            layerCanvas.height = canvas.height;
            const ctx = layerCanvas.getContext("2d");
            if (!ctx) return;
            const scale = Math.min(
              canvas.width / (window.devicePixelRatio || 1) / img.width,
              canvas.height / (window.devicePixelRatio || 1) / img.height,
              1,
            );
            const dpr = window.devicePixelRatio || 1;
            const w = img.width * scale * dpr;
            const h = img.height * scale * dpr;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            canvasRef.current?.putLayerImageData(newId, imageData);
          }, 100);

          return next;
        });
      };
      img.onerror = () => {
        console.error("Failed to load AI generated image");
      };
      img.src = imageUrl;
    },
    [saveLayersToPage],
  );

  // ─── Legacy raster transform helpers ─────────────────────────────────

  /**
   * Merge a partial update into the current transformState.
   * The TransformTool class handles all math; App just stores state.
   */
  const handleTransformChange = useCallback(
    (
      partial: Partial<
        Omit<TransformState, "originalImageData" | "layerIds" | "originalData">
      >,
    ) => {
      setTransformState((prev) => (prev ? { ...prev, ...partial } : prev));
    },
    [],
  );

  /**
   * Activate the LEGACY raster transform tool.
   * Kept for backward compat — no longer called from the transform tool path.
   * @deprecated Use activateVectorTransform instead.
   */
  const _activateTransform = useCallback(() => {
    const dpr = window.devicePixelRatio || 1;
    const currentPageSize = customCanvasSize
      ? customCanvasSize
      : (PAGE_SIZE_MAP[pageSizeKey] ?? PAGE_SIZE_MAP.Square);
    const cw = currentPageSize.width;
    const ch = currentPageSize.height;

    const targetIds: number[] =
      selectedLayerIds.length >= 2 ? selectedLayerIds : [activeLayerId];

    const snapshots: ImageData[] = [];
    let combinedMinX = cw;
    let combinedMinY = ch;
    let combinedMaxX = 0;
    let combinedMaxY = 0;
    let anyContent = false;

    for (const id of targetIds) {
      const imgData = canvasRef.current?.getLayerImageData(id);
      if (!imgData) {
        const empty = new ImageData(Math.round(cw * dpr), Math.round(ch * dpr));
        snapshots.push(empty);
        continue;
      }
      snapshots.push(imgData);

      const physW = imgData.width;
      const physH = imgData.height;
      const bounds = computeLayerContentBounds(imgData, physW, physH, dpr);
      if (bounds) {
        anyContent = true;
        if (bounds.minX < combinedMinX) combinedMinX = bounds.minX;
        if (bounds.minY < combinedMinY) combinedMinY = bounds.minY;
        if (bounds.maxX > combinedMaxX) combinedMaxX = bounds.maxX;
        if (bounds.maxY > combinedMaxY) combinedMaxY = bounds.maxY;
      }
    }

    if (!anyContent) {
      combinedMinX = 0;
      combinedMinY = 0;
      combinedMaxX = cw;
      combinedMaxY = ch;
    }

    combinedMinX = Math.max(0, combinedMinX);
    combinedMinY = Math.max(0, combinedMinY);
    combinedMaxX = Math.min(cw, combinedMaxX);
    combinedMaxY = Math.min(ch, combinedMaxY);

    const bw = Math.max(4, combinedMaxX - combinedMinX);
    const bh = Math.max(4, combinedMaxY - combinedMinY);

    setTransformState({
      x: combinedMinX,
      y: combinedMinY,
      width: bw,
      height: bh,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      flipH: false,
      flipV: false,
      pivotX: combinedMinX + bw / 2,
      pivotY: combinedMinY + bh / 2,
      originalImageData: snapshots,
      layerIds: targetIds,
      snapEnabled: true,
      gridSize: 10,
      aspectLocked: false,
      layerId: targetIds[0],
      selectedLayerIds: targetIds,
      maintainAspectRatio: false,
    });
    setTransformActive(true);
  }, [activeLayerId, selectedLayerIds, customCanvasSize, pageSizeKey]);
  void _activateTransform;

  /**
   * Apply the final raster transform matrix to each selected layer's canvas.
   */
  const handleTransformConfirm = useCallback(() => {
    const finalState = transformState;
    if (!finalState) return;
    const dpr = window.devicePixelRatio || 1;
    const canvasEl = canvasRef.current?.getCanvas();
    if (!canvasEl) return;

    const physW = canvasEl.width;
    const physH = canvasEl.height;

    const {
      x,
      y,
      width,
      height,
      angle,
      scaleX,
      scaleY,
      skewX,
      skewY,
      flipH,
      flipV,
      pivotX,
      pivotY,
      originalImageData,
      layerIds,
    } = finalState;

    const cpx = pivotX * dpr;
    const cpy = pivotY * dpr;

    for (let i = 0; i < layerIds.length; i++) {
      const layerId = layerIds[i];
      const origData = originalImageData[i];
      if (!origData) continue;

      const tmp = document.createElement("canvas");
      tmp.width = physW;
      tmp.height = physH;
      const tctx = tmp.getContext("2d");
      if (!tctx) continue;

      const src = document.createElement("canvas");
      src.width = physW;
      src.height = physH;
      const sctx = src.getContext("2d");
      if (!sctx) continue;
      sctx.putImageData(origData, 0, 0);

      const rad = (angle * Math.PI) / 180;
      const skXRad = (skewX * Math.PI) / 180;
      const skYRad = (skewY * Math.PI) / 180;
      const sx = scaleX * (flipH ? -1 : 1);
      const sy = scaleY * (flipV ? -1 : 1);

      tctx.save();
      tctx.translate(cpx, cpy);
      tctx.rotate(rad);
      tctx.transform(1, Math.tan(skYRad), Math.tan(skXRad), 1, 0, 0);
      tctx.scale(sx, sy);
      tctx.translate(-cpx, -cpy);

      tctx.drawImage(
        src,
        x * dpr,
        y * dpr,
        width * dpr,
        height * dpr,
        x * dpr,
        y * dpr,
        width * dpr,
        height * dpr,
      );
      tctx.restore();

      const resultData = tctx.getImageData(0, 0, physW, physH);
      canvasRef.current?.putLayerImageData(layerId, resultData);
    }

    pushUndo(layers);

    setTransformState(null);
    setTransformActive(false);
  }, [transformState, layers, pushUndo]);

  const handleTransformConfirmWithState = useCallback(
    (_state: TransformState) => handleTransformConfirm(),
    [handleTransformConfirm],
  );

  const handleTransformCancel = useCallback(() => {
    if (!transformState) return;
    for (let i = 0; i < transformState.layerIds.length; i++) {
      const layerId = transformState.layerIds[i];
      const origData = transformState.originalImageData[i];
      if (origData) {
        canvasRef.current?.putLayerImageData(layerId, origData);
      }
    }
    setTransformState(null);
    setTransformActive(false);
  }, [transformState]);

  const handleTransformReset = useCallback(() => {
    if (!transformState) return;
    for (let i = 0; i < transformState.layerIds.length; i++) {
      const origData = transformState.originalImageData[i];
      if (origData) {
        canvasRef.current?.putLayerImageData(
          transformState.layerIds[i],
          origData,
        );
      }
    }
    const currentPageSize = customCanvasSize
      ? customCanvasSize
      : (PAGE_SIZE_MAP[pageSizeKey] ?? PAGE_SIZE_MAP.Square);
    const rw = currentPageSize.width;
    const rh = currentPageSize.height;
    setTransformState((prev) =>
      prev
        ? {
            ...prev,
            x: 0,
            y: 0,
            width: rw,
            height: rh,
            angle: 0,
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            skewY: 0,
            flipH: false,
            flipV: false,
            pivotX: rw / 2,
            pivotY: rh / 2,
          }
        : prev,
    );
  }, [transformState, customCanvasSize, pageSizeKey]);

  const handleFlipH = useCallback(() => {
    setTransformState((prev) =>
      prev ? { ...prev, flipH: !prev.flipH } : prev,
    );
  }, []);

  const handleFlipV = useCallback(() => {
    setTransformState((prev) =>
      prev ? { ...prev, flipV: !prev.flipV } : prev,
    );
  }, []);

  // ─── Vector transform callbacks ───────────────────────────────────────

  /**
   * Called by VectorTransformTool on every drag frame.
   * Writes the live-transformed strokes to the layer for instant preview.
   */
  const handleVectorTransformUpdate = useCallback(
    (transformedStrokes: Stroke[], state: VectorTransformState) => {
      setVectorTransformState(state);
      setPreviewStrokes(transformedStrokes);
      if (canvasRef.current) {
        canvasRef.current.setLayerStrokes(activeLayerId, transformedStrokes);
        canvasRef.current.redrawLayerFromStrokes(activeLayerId);
      }
    },
    [activeLayerId],
  );

  /**
   * Called when user confirms the transform (Enter / ✓).
   * Permanently saves the transformed strokes and pushes an undo entry.
   */
  const handleVectorTransformConfirm = useCallback(
    (transformedStrokes: Stroke[], _state: VectorTransformState) => {
      if (canvasRef.current) {
        canvasRef.current.setLayerStrokes(activeLayerId, transformedStrokes);
        canvasRef.current.redrawLayerFromStrokes(activeLayerId);
        canvasRef.current.saveHistory();
      }
      pushUndo(layers);

      // Destroy VTT instance
      vttRef.current?.destroy();
      vttRef.current = null;
      originalStrokesRef.current = null;

      setVectorTransformActive(false);
      setVectorTransformState(null);
      setPreviewStrokes(null);
      setMarqueeSelection(null);
    },
    [activeLayerId, layers, pushUndo],
  );

  /**
   * Called when user cancels (Escape / ✕).
   * Restores the original strokes — no undo entry needed.
   */
  const handleVectorTransformCancel = useCallback(() => {
    const origStrokes = originalStrokesRef.current;
    if (origStrokes && canvasRef.current) {
      canvasRef.current.setLayerStrokes(activeLayerId, origStrokes);
      canvasRef.current.redrawLayerFromStrokes(activeLayerId);
    }

    // Destroy VTT instance
    vttRef.current?.destroy();
    vttRef.current = null;
    originalStrokesRef.current = null;

    setVectorTransformActive(false);
    setVectorTransformState(null);
    setPreviewStrokes(null);
    setMarqueeSelection(null);
  }, [activeLayerId]);

  /**
   * Activate the VectorTransformTool on the active layer.
   *
   * Multi-layer support: when selectedLayerIds has more than one entry,
   * combine all selected layers' strokes into one transform group by
   * operating on the active layer — the UI shows a combined bounding box.
   *
   * @param selectedIndices   Optional subset of stroke indices to transform.
   *                          Pass undefined / [] to transform ALL strokes.
   * @param partialSelections Optional per-stroke point-level selections
   *                          for partial brush stroke transforms.
   */
  const activateVectorTransform = useCallback(
    (
      selectedIndices?: number[],
      partialSelections?: PartialStrokeSelection[],
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Cancel any existing VTT before creating a new one
      if (vttRef.current) {
        vttRef.current.destroy();
        vttRef.current = null;
      }

      // Determine target layer IDs
      const targetLayerIds =
        selectedLayerIds.length >= 2 ? selectedLayerIds : [activeLayerId];
      const primaryLayerId = targetLayerIds[0];

      // Collect strokes. For multi-layer, merge into primary layer strokes.
      let allStrokes: Stroke[] = canvas.getLayerStrokes(primaryLayerId);

      if (targetLayerIds.length > 1) {
        // Merge additional layers' strokes into the combined list
        for (const lid of targetLayerIds.slice(1)) {
          allStrokes = [...allStrokes, ...canvas.getLayerStrokes(lid)];
        }
      }

      if (allStrokes.length === 0) {
        // Nothing to transform — silently return (no error state needed)
        return;
      }

      // Store a deep copy of original strokes for cancel restore
      originalStrokesRef.current = allStrokes.map((s) => ({
        ...s,
        points: s.points.map((p) => ({ ...p })),
        vectorShape: s.vectorShape ? { ...s.vectorShape } : undefined,
        fillData: s.fillData
          ? new ImageData(
              new Uint8ClampedArray(s.fillData.data),
              s.fillData.width,
              s.fillData.height,
            )
          : undefined,
      }));

      // Need the overlay canvas element — it's the TransformOverlay's <canvas>
      const overlayEl = overlayCanvasRef.current;
      if (!overlayEl) return;

      const currentPageSize = customCanvasSize
        ? customCanvasSize
        : (PAGE_SIZE_MAP[pageSizeKey] ?? PAGE_SIZE_MAP.Square);

      const vtt = new VectorTransformTool(overlayEl, {
        canvasWidth: currentPageSize.width,
        canvasHeight: currentPageSize.height,
        zoom,
        onTransformUpdate: handleVectorTransformUpdate,
        onConfirm: handleVectorTransformConfirm,
        onCancel: handleVectorTransformCancel,
      });

      vtt.activate(allStrokes, selectedIndices, partialSelections);
      vttRef.current = vtt;

      setVectorTransformActive(true);
      setVectorTransformState(vtt.getState());
      setMarqueeSelection(null);
    },
    [
      activeLayerId,
      selectedLayerIds,
      customCanvasSize,
      pageSizeKey,
      zoom,
      handleVectorTransformUpdate,
      handleVectorTransformConfirm,
      handleVectorTransformCancel,
    ],
  );

  // Keep VTT zoom option in sync when zoom changes
  useEffect(() => {
    if (vttRef.current) {
      vttRef.current.setOptions({ zoom });
    }
  }, [zoom]);

  // ─── TransformToolPanel wiring ────────────────────────────────────────

  /**
   * Propagate panel numeric input changes to the active VectorTransformTool.
   * Accepts a Partial<VectorTransformState> patch and merges it into the current state.
   */
  const handleVectorTransformPanelChange = useCallback(
    (patch: Partial<VectorTransformState>) => {
      if (!vttRef.current) return;
      const current = vttRef.current.getState();
      if (!current) return;

      const merged: VectorTransformState = {
        ...current,
        ...patch,
      };

      vttRef.current.setState(merged);
      setVectorTransformState(merged);
    },
    [],
  );

  const handleVectorFlipH = useCallback(() => {
    if (!vttRef.current) return;
    vttRef.current.flipH();
    setVectorTransformState(vttRef.current.getState());
  }, []);

  const handleVectorFlipV = useCallback(() => {
    if (!vttRef.current) return;
    vttRef.current.flipV();
    setVectorTransformState(vttRef.current.getState());
  }, []);

  const handleVectorReset = useCallback(() => {
    if (!vttRef.current) return;
    vttRef.current.resetTransform();
    setVectorTransformState(vttRef.current.getState());
  }, []);

  const handleVectorResetPivot = useCallback(() => {
    if (!vttRef.current) return;
    vttRef.current.resetPivot();
    setVectorTransformState(vttRef.current.getState());
  }, []);

  // ─── Layer → Transform shortcut ──────────────────────────────────────
  /**
   * Called when user clicks the Move & Resize icon on a layer row.
   * 1. Makes that layer active.
   * 2. Switches to the transform tool.
   * 3. Activates VectorTransformTool on all of that layer's strokes.
   * Shows a brief visual hint if the layer is empty.
   */
  const [layerEmptyToastVisible, setLayerEmptyToastVisible] = useState(false);

  const handleLayerTransformClick = useCallback(
    (layerId: number) => {
      // Cancel any ongoing transform first
      if (vttRef.current) {
        vttRef.current.destroy();
        vttRef.current = null;
        setVectorTransformActive(false);
        setVectorTransformState(null);
        setPreviewStrokes(null);
        setMarqueeSelection(null);
      }

      // Make this layer active
      setActiveLayerId(layerId);
      setSelectedLayerIds([layerId]);

      // Get strokes for this layer from canvasRef
      const strokes = canvasRef.current?.getLayerStrokes(layerId) ?? [];
      if (strokes.length === 0) {
        // Show empty-layer hint briefly
        setLayerEmptyToastVisible(true);
        setTimeout(() => setLayerEmptyToastVisible(false), 2200);
        // Switch to transform tool visually so user knows it worked
        setActiveTool("transform");
        setShowBrushPanel(false);
        setShowEraserPanel(false);
        setShowShapePanel(false);
        return;
      }

      // Switch to transform tool
      setActiveTool("transform");
      setShowBrushPanel(false);
      setShowEraserPanel(false);
      setShowShapePanel(false);

      // Need the overlay canvas — it mounts when activeTool === 'transform'.
      // We defer VTT activation by one tick so the overlay canvas has mounted.
      setTimeout(() => {
        const overlayEl = overlayCanvasRef.current;
        if (!overlayEl) {
          // Overlay not mounted yet — nothing we can do
          return;
        }

        const allStrokes = canvasRef.current?.getLayerStrokes(layerId) ?? [];
        if (allStrokes.length === 0) return;

        // Store deep copy for cancel
        originalStrokesRef.current = allStrokes.map((s) => ({
          ...s,
          points: s.points.map((p) => ({ ...p })),
          vectorShape: s.vectorShape ? { ...s.vectorShape } : undefined,
          fillData: s.fillData
            ? new ImageData(
                new Uint8ClampedArray(s.fillData.data),
                s.fillData.width,
                s.fillData.height,
              )
            : undefined,
        }));

        const currentPageSize = customCanvasSize
          ? customCanvasSize
          : (PAGE_SIZE_MAP[pageSizeKey] ?? PAGE_SIZE_MAP.Square);

        const vtt = new VectorTransformTool(overlayEl, {
          canvasWidth: currentPageSize.width,
          canvasHeight: currentPageSize.height,
          zoom,
          onTransformUpdate: handleVectorTransformUpdate,
          onConfirm: handleVectorTransformConfirm,
          onCancel: handleVectorTransformCancel,
        });

        vtt.activate(allStrokes);
        vttRef.current = vtt;
        setVectorTransformActive(true);
        setVectorTransformState(vtt.getState());
        setMarqueeSelection(null);
      }, 30);
    },
    [
      customCanvasSize,
      pageSizeKey,
      zoom,
      handleVectorTransformUpdate,
      handleVectorTransformConfirm,
      handleVectorTransformCancel,
    ],
  );

  const handleToolChange = useCallback(
    (tool: DrawingTool) => {
      setActiveTool(tool);
      setShowBrushPanel(tool === "brush");
      setShowEraserPanel(tool === "eraser");
      setShowShapePanel(tool === "shape");
      if (tool !== "text") setTextClickPos(null);

      if (tool === "transform") {
        // Use vector transform — activate immediately (auto-groups all strokes)
        activateVectorTransform();
      } else {
        // Leaving transform tool: cancel any pending VTT
        if (vectorTransformActive) {
          handleVectorTransformCancel();
        }
        // Also cancel legacy raster transform if somehow active
        if (transformActive) {
          setTransformActive(false);
          setTransformState(null);
        }
      }
    },
    [
      activateVectorTransform,
      vectorTransformActive,
      handleVectorTransformCancel,
      transformActive,
    ],
  );

  // Ctrl+T shortcut for transform
  useEffect(() => {
    if (currentView !== "app") return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        handleToolChange("transform");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentView, handleToolChange]);

  const handleTextClick = useCallback(
    (canvasX: number, canvasY: number, screenX: number, screenY: number) => {
      setTextClickPos({ canvasX, canvasY, screenX, screenY });
    },
    [],
  );

  const handleTextConfirm = useCallback(
    (opts: TextOptions) => {
      if (!textClickPos) return;
      canvasRef.current?.drawText?.(
        textClickPos.canvasX,
        textClickPos.canvasY,
        opts.text,
        opts.fontFamily,
        opts.fontSize,
        opts.bold ? "bold" : "normal",
        opts.italic ? "italic" : "normal",
        opts.color,
        opts.textAlign,
        opts.underline,
      );
      setTextClickPos(null);
    },
    [textClickPos],
  );

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((prev) =>
      Math.max(10, Math.min(500, prev - Math.sign(e.deltaY) * 10)),
    );
  }, []);

  // ─── Marquee pointer events for transform tool ────────────────────────
  /**
   * When transform tool is active but NO VTT is running yet, the user can
   * draw a dashed rectangle to select a subset of strokes.
   * On mouseup: call getStrokesInRect then activateVectorTransform(indices).
   */
  const handleMarqueePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool !== "transform" || vectorTransformActive) return;
      // Only start marquee if click is inside canvas wrapper (not on handles)
      marqueeDrawingRef.current = true;
      marqueeStartRef.current = { x: e.clientX, y: e.clientY };
      setMarqueeSelection(null);
    },
    [activeTool, vectorTransformActive],
  );

  const handleMarqueePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!marqueeDrawingRef.current || !marqueeStartRef.current) return;
      const sx = marqueeStartRef.current.x;
      const sy = marqueeStartRef.current.y;
      const ex = e.clientX;
      const ey = e.clientY;
      setMarqueeSelection({
        x: Math.min(sx, ex),
        y: Math.min(sy, ey),
        width: Math.abs(ex - sx),
        height: Math.abs(ey - sy),
      });
    },
    [],
  );

  const handleMarqueePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!marqueeDrawingRef.current) return;
      marqueeDrawingRef.current = false;

      const start = marqueeStartRef.current;
      if (!start) return;
      marqueeStartRef.current = null;

      // Convert screen rect to canvas-space rect
      const canvasEl = canvasRef.current?.getCanvas();
      if (!canvasEl) {
        // Fallback: activate on all strokes
        activateVectorTransform();
        return;
      }

      const rect = canvasEl.getBoundingClientRect();
      const zf = zoom / 100;

      // Normalize screen rect
      const screenX = Math.min(start.x, e.clientX);
      const screenY = Math.min(start.y, e.clientY);
      const screenW = Math.abs(e.clientX - start.x);
      const screenH = Math.abs(e.clientY - start.y);

      // If tiny drag (< 4px), treat as "select all"
      if (screenW < 4 && screenH < 4) {
        activateVectorTransform();
        setMarqueeSelection(null);
        return;
      }

      // Convert to canvas-space selection box
      const selBox = {
        x: (screenX - rect.left) / zf,
        y: (screenY - rect.top) / zf,
        width: screenW / zf,
        height: screenH / zf,
      };

      // Get all strokes on the active layer
      const allStrokes =
        canvasRef.current?.getLayerStrokes(activeLayerId) ?? [];

      if (allStrokes.length === 0) {
        setMarqueeSelection(null);
        return;
      }

      // Build partial selections: for each stroke, find which points fall inside
      // the selection box (canvas-space). Collect only strokes that have ≥1 point inside.
      const partialSelections: PartialStrokeSelection[] = [];
      const strokeIndices: number[] = [];

      for (let si = 0; si < allStrokes.length; si++) {
        const stroke = allStrokes[si];
        const pointIndices = getPointIndicesInBox(stroke.points, selBox);
        if (pointIndices.length > 0) {
          strokeIndices.push(si);
          // If ALL points are inside the box, no need to store partial indices
          const isFullStroke = pointIndices.length === stroke.points.length;
          partialSelections.push({
            strokeIndex: si,
            pointIndices: isFullStroke ? undefined : pointIndices,
          });
        }
      }

      if (strokeIndices.length === 0) {
        // Nothing selected — activate on all strokes
        activateVectorTransform();
      } else {
        // Check if any selection is truly partial (not all points)
        const hasPartial = partialSelections.some(
          (ps) => ps.pointIndices !== undefined,
        );
        activateVectorTransform(
          strokeIndices,
          hasPartial ? partialSelections : undefined,
        );
      }

      setMarqueeSelection(null);
    },
    [activateVectorTransform, activeLayerId, zoom],
  );

  // ─── Page size from key ───────────────────────────────────────────────
  const canvasPageSize = customCanvasSize
    ? { ...customCanvasSize, label: "Custom" }
    : (PAGE_SIZE_MAP[pageSizeKey] ?? PAGE_SIZE_MAP.Square);
  const canvasBg = pageColor === "transparent" ? "transparent" : pageColor;

  // Effective brush size for eraser vs brush
  const effectiveBrushSize = activeTool === "eraser" ? eraserSize : brushSize;

  // LayerFilterData compatible from LayerFilter
  const layerFiltersForCanvas: Record<number, LayerFilterData> =
    layerFilters as Record<number, LayerFilterData>;

  const activeLayerLocked =
    layers.find((l) => l.id === activeLayerId)?.locked ?? false;

  // ─── Render ───────────────────────────────────────────────────────────
  // Access control: require paid access to use the canvas
  const { walletAddress: _appWallet } = useWeb3Auth();
  const hasCanvasAccess = _appWallet ? checkPaidAccess(_appWallet) : false;

  return (
    <>
      <PageTransitionLoader isLoading={isTransitioning} />

      {/* App splash/loading screen — shown once per session */}
      {showAppLoader && (
        <AppLoadingScreen
          onComplete={() => {
            sessionStorage.setItem("sketchora_loaded", "1");
            setShowAppLoader(false);
          }}
        />
      )}

      {/* Canvas size dashboard — shown once per session when entering the app */}
      {currentView === "app" && showDashboard && (
        <CanvasDashboard
          onStart={(w, h) => {
            setCustomCanvasSize({ width: w, height: h });
            setPageSizeKey("Custom");
            setShowDashboard(false);
          }}
        />
      )}

      {currentView === "landing" && (
        <div style={{ opacity: 1, transition: "opacity 0.4s ease" }}>
          <LandingPage
            onLaunchApp={() => navigateWithLoader("app")}
            onShowLogin={() => navigateWithLoader("app")}
            onShowGuide={() => navigateWithLoader("guide")}
          />
        </div>
      )}

      {currentView === "guide" && (
        <UserGuidePage onGoHome={() => navigateWithLoader("landing")} />
      )}

      {currentView === "app" && (
        <div
          className="flex flex-col"
          style={{
            height: "100dvh",
            overflow: "hidden",
            background:
              colorTheme === "light"
                ? "#e8e8ec"
                : colorTheme === "purple"
                  ? "#0d0a1a"
                  : "#0d0d0f",
            transition: "background 0.4s ease",
          }}
        >
          <TopNavBar
            projectName="Untitled Project"
            onProjectNameChange={() => {}}
            zoom={zoom}
            onZoomChange={setZoom}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onExport={handleExport}
            onClear={handleClearCanvas}
            uiTheme={uiTheme}
            uiAccent={uiAccent}
            brushColor={brushColor}
            onBrushColorChange={setBrushColor}
            colorTheme={colorTheme}
            onColorThemeChange={handleColorThemeChange}
            profileImage={profileImage}
            onProfileImageChange={setProfileImage}
            onSettingsOpen={() => setShowSettingsModal((v) => !v)}
            onImportImage={handleImportImage}
            onNewProject={handleNewProject}
            onSave={handleSaveDrw}
            onSaveAs={handleSaveAs}
            onExportPNG={handleExportPNG}
            onExportJPG={handleExportJPG}
            onCanvasSettingsOpen={() => setShowSettingsModal((v) => !v)}
            web3WalletAddress={web3WalletAddress}
            onGoHome={() => {
              if (onGoHome) {
                onGoHome();
              } else {
                navigateWithLoader("landing");
              }
            }}
          />

          {/* Paid access gate — fallback guard for direct /draw navigation */}
          {!hasCanvasAccess && !showDashboard && !showAppLoader && (
            <div
              data-ocid="canvas.access_gate"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(4,6,20,0.88)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(15,10,30,0.98), rgba(10,8,22,0.98))",
                  border: "1px solid rgba(139,92,246,0.4)",
                  borderRadius: 24,
                  padding: "48px 40px",
                  textAlign: "center",
                  maxWidth: 420,
                  width: "90vw",
                  boxShadow:
                    "0 0 60px rgba(139,92,246,0.15), 0 20px 60px rgba(0,0,0,0.7)",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#f0eaff",
                    margin: "0 0 12px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Drawing Access Required
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(240,234,255,0.6)",
                    lineHeight: 1.7,
                    margin: "0 0 24px",
                  }}
                >
                  Connect wallet and complete 0.1 USDC payment to start drawing
                  on Arc Testnet.
                </p>
                <button
                  type="button"
                  data-ocid="canvas.access_gate.button"
                  onClick={() => {
                    if (onGoHome) onGoHome();
                    else navigateWithLoader("landing");
                  }}
                  style={{
                    padding: "12px 32px",
                    borderRadius: 999,
                    border: "none",
                    background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                    fontFamily: "inherit",
                  }}
                >
                  ← Go to Landing Page
                </button>
              </div>
            </div>
          )}

          {showBrushPanel && (
            <FloatingBrushPanel
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              opacity={brushOpacity}
              onOpacityChange={setBrushOpacity}
              hardness={brushHardness}
              onHardnessChange={setBrushHardness}
              brushColor={brushColor}
              onBrushColorChange={setBrushColor}
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

          {showEraserPanel && (
            <FloatingEraserPanel
              eraserSize={eraserSize}
              onEraserSizeChange={setEraserSize}
              eraserSoftness={eraserSoftness}
              onEraserSoftnessChange={setEraserSoftness}
              accentColor={uiAccent.accent}
              onClose={() => setShowEraserPanel(false)}
            />
          )}

          {showShapePanel && (
            <FloatingShapePanel
              selectedShape={shapeType}
              onShapeSelect={setShapeType}
              accentColor={uiAccent.accent}
              onClose={() => setShowShapePanel(false)}
            />
          )}

          {textClickPos && (
            <FloatingTextPanel
              initialX={textClickPos.screenX}
              initialY={textClickPos.screenY}
              canvasX={textClickPos.canvasX}
              canvasY={textClickPos.canvasY}
              color={brushColor}
              accentColor={uiAccent.accent}
              onConfirm={handleTextConfirm}
              onCancel={() => setTextClickPos(null)}
            />
          )}

          {showSettingsModal && (
            <FloatingSettingsModal
              pageColor={pageColor}
              onPageColorChange={setPageColor}
              canvasTheme={canvasTheme}
              onCanvasThemeChange={setCanvasTheme}
              pageSizeKey={pageSizeKey}
              onPageSizeChange={setPageSizeKey}
              onClose={() => setShowSettingsModal(false)}
              accentColor={uiAccent.accent}
              accentBg={uiAccent.accentBg}
              accentBorder={uiAccent.accentBorder}
              onExport={handleExport}
            />
          )}

          {showCreditModal && (
            <CreditModal
              onClose={() => setShowCreditModal(false)}
              onStartDrawing={() => setShowCreditModal(false)}
            />
          )}

          {/* AI Assistant Panel */}
          {showAIPanel && (
            <AIAssistantPanel
              onColorSelect={(color) => {
                setBrushColor(color);
                addColorToHistory(color);
              }}
              onAddColorToHistory={addColorToHistory}
              onInsertImageLayer={handleInsertAIImageLayer}
              onClose={() => setShowAIPanel(false)}
              accentColor={uiAccent.accent}
            />
          )}

          {/* Vector transform panel — shown when VTT is active */}
          {vectorTransformActive && vectorTransformState && (
            <TransformPanel
              state={vectorTransformState}
              isVisible={vectorTransformActive}
              accentColor={uiAccent.accent}
              canvasWidth={canvasPageSize.width}
              canvasHeight={canvasPageSize.height}
              onStateChange={handleVectorTransformPanelChange}
              onConfirm={() => {
                if (vttRef.current) {
                  const state = vttRef.current.getState();
                  if (state) {
                    handleVectorTransformConfirm(
                      vttRef.current.getTransformedStrokes(),
                      state,
                    );
                  }
                }
              }}
              onCancel={handleVectorTransformCancel}
              onFlipH={handleVectorFlipH}
              onFlipV={handleVectorFlipV}
              onReset={handleVectorReset}
              onResetPivot={handleVectorResetPivot}
            />
          )}

          {/* Legacy raster panel — only shown if somehow raster transform is active */}
          {transformActive && !vectorTransformActive && (
            <TransformToolPanel
              transformState={transformState}
              onTransformChange={handleTransformChange}
              onConfirm={handleTransformConfirm}
              onCancel={handleTransformCancel}
              onFlipH={handleFlipH}
              onFlipV={handleFlipV}
              onReset={handleTransformReset}
              accentColor={uiAccent.accent}
              canvasWidth={canvasPageSize.width}
              canvasHeight={canvasPageSize.height}
            />
          )}

          <div
            className="flex flex-1"
            style={{ overflow: "hidden", position: "relative" }}
          >
            <LeftToolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              brushColor={brushColor}
              uiTheme={uiTheme}
              uiAccent={uiAccent}
              colorHistory={colorHistory}
              onColorSelect={(c) => {
                setBrushColor(c);
                addColorToHistory(c);
              }}
              colorTheme={colorTheme}
              showAIPanel={showAIPanel}
              onToggleAIPanel={() => setShowAIPanel((v) => !v)}
            />

            <div
              className="flex flex-col flex-1"
              style={{ overflow: "hidden", position: "relative" }}
            >
              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    colorTheme === "light"
                      ? "#d0d0d8"
                      : colorTheme === "purple"
                        ? "#100824"
                        : "#141418",
                  cursor:
                    activeTool === "pan"
                      ? isPanningRef.current
                        ? "grabbing"
                        : "grab"
                      : activeTool === "transform" && !vectorTransformActive
                        ? "crosshair"
                        : undefined,
                }}
                onWheel={handleCanvasWheel}
                onMouseDown={(e) => {
                  if (activeTool === "pan") {
                    isPanningRef.current = true;
                    panStartRef.current = {
                      x: e.clientX,
                      y: e.clientY,
                      ox: panOffset.x,
                      oy: panOffset.y,
                    };
                    e.preventDefault();
                  }
                }}
                onMouseMove={(e) => {
                  if (activeTool === "pan" && isPanningRef.current) {
                    setPanOffset({
                      x:
                        panStartRef.current.ox +
                        (e.clientX - panStartRef.current.x),
                      y:
                        panStartRef.current.oy +
                        (e.clientY - panStartRef.current.y),
                    });
                  }
                }}
                onMouseUp={() => {
                  isPanningRef.current = false;
                }}
                onMouseLeave={() => {
                  isPanningRef.current = false;
                }}
                // Marquee selection for transform tool
                onPointerDown={handleMarqueePointerDown}
                onPointerMove={handleMarqueePointerMove}
                onPointerUp={handleMarqueePointerUp}
              >
                <div
                  style={{
                    position: "relative",
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                    transformOrigin: "center center",
                    ...(canvasBg === "transparent"
                      ? {
                          backgroundImage:
                            "repeating-conic-gradient(#888 0% 25%, #ccc 0% 50%)",
                          backgroundSize: "16px 16px",
                        }
                      : {}),
                  }}
                >
                  <DrawingCanvas
                    key={`page-${activePageId}`}
                    ref={canvasRef}
                    layers={layers}
                    activeLayerId={activeLayerId}
                    activeTool={activeTool}
                    brushColor={brushColor}
                    brushSize={effectiveBrushSize}
                    brushOpacity={brushOpacity}
                    brushHardness={brushHardness}
                    brushShape={brushShape}
                    fillTolerance={fillTolerance}
                    pageSize={{
                      width: canvasPageSize.width,
                      height: canvasPageSize.height,
                    }}
                    canvasBg={canvasBg}
                    zoom={zoom}
                    onLayersChange={handleLayersChange}
                    onStrokeEnd={handleStrokeEnd}
                    onColorPick={(color) => {
                      setBrushColor(color);
                      addColorToHistory(color);
                    }}
                    layerFilters={layerFiltersForCanvas}
                    onLayerThumbnailUpdate={setLayerThumbnails}
                    eraserSoftness={eraserSoftness}
                    selectionRect={selectionRect}
                    activeLayerLocked={activeLayerLocked}
                    shapeToolType={activeTool === "shape" ? shapeType : null}
                    onTextClick={handleTextClick}
                    onEyedropperMove={(color, x, y) =>
                      setEyedropperPreview(color ? { color, x, y } : null)
                    }
                  />
                  {eyedropperPreview && activeTool === "colorpicker" && (
                    <div
                      style={{
                        position: "fixed",
                        left: eyedropperPreview.x,
                        top: eyedropperPreview.y,
                        transform: "translate(-50%, -130%)",
                        zIndex: 9999,
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: eyedropperPreview.color,
                          border: "2px solid white",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                        }}
                      />
                      <span
                        style={{
                          background: "rgba(0,0,0,0.85)",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: "monospace",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {eyedropperPreview.color}
                      </span>
                    </div>
                  )}
                  <SelectionOverlay
                    active={activeTool === "select"}
                    canvasRef={canvasRef}
                    pageWidth={canvasPageSize.width}
                    pageHeight={canvasPageSize.height}
                    onSelectionChange={setSelectionRect}
                    zoom={zoom}
                  />
                  {/* TransformOverlay: legacy raster mode handles / canvas */}
                  {(transformActive || activeTool === "transform") && (
                    <TransformOverlay
                      transformState={
                        transformActive && !vectorTransformActive
                          ? transformState
                          : null
                      }
                      canvasWidth={canvasPageSize.width}
                      canvasHeight={canvasPageSize.height}
                      zoom={zoom}
                      onTransformChange={handleTransformChange}
                      onConfirm={handleTransformConfirmWithState}
                      onCancel={handleTransformCancel}
                      vectorTransformActive={vectorTransformActive}
                      vttRef={vttRef}
                    />
                  )}
                  {/* Dedicated canvas for VectorTransformTool handle rendering.
                      Mounted whenever the transform tool is active. */}
                  {activeTool === "transform" && (
                    <canvas
                      ref={overlayCanvasRef}
                      width={canvasPageSize.width}
                      height={canvasPageSize.height}
                      data-ocid="vector_transform.overlay_canvas"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: vectorTransformActive ? "all" : "none",
                        touchAction: "none",
                        zIndex: 11,
                        background: "transparent",
                      }}
                    />
                  )}
                </div>

                {/* Marquee selection rectangle (screen-space overlay) */}
                {marqueeSelection &&
                  activeTool === "transform" &&
                  !vectorTransformActive && (
                    <div
                      data-ocid="transform.marquee_overlay"
                      style={{
                        position: "fixed",
                        left: marqueeSelection.x,
                        top: marqueeSelection.y,
                        width: marqueeSelection.width,
                        height: marqueeSelection.height,
                        border: "1.5px dashed rgba(59,130,246,0.85)",
                        background: "rgba(59,130,246,0.07)",
                        pointerEvents: "none",
                        zIndex: 20,
                        borderRadius: 2,
                        boxShadow: "0 0 0 1px rgba(59,130,246,0.15)",
                      }}
                    />
                  )}
              </div>

              <PageBar
                pages={pages}
                activePageId={activePageId}
                onSelectPage={handleSelectPage}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onRenamePage={handleRenamePage}
                onDuplicatePage={handleDuplicatePage}
                uiAccent={uiAccent}
              />
            </div>

            <RightPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSetActive={setActiveLayerId}
              onAddLayer={handleAddLayer}
              onDeleteLayer={handleDeleteLayer}
              onToggleVisible={handleToggleVisible}
              onRenameLayer={handleRenameLayer}
              onOpacityChange={handleLayerOpacityChange}
              onMoveLayer={handleMoveLayer}
              onDuplicateLayer={handleDuplicateLayer}
              onReorderLayers={handleReorderLayers}
              onLockLayer={handleLockLayer}
              brushColor={brushColor}
              onBrushColorChange={setBrushColor}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              brushShape={brushShape}
              onBrushShapeChange={setBrushShape}
              opacity={brushOpacity}
              onOpacityPropChange={setBrushOpacity}
              canvasTheme={canvasTheme}
              onThemeChange={setCanvasTheme}
              uiTheme={uiTheme}
              onUiThemeToggle={handleUiThemeToggle}
              pageSizeKey={pageSizeKey}
              onPageSizeChange={setPageSizeKey}
              onClear={handleClearCanvas}
              uiAccent={uiAccent}
              layerFilters={layerFilters}
              onLayerFilterChange={handleLayerFilterChange}
              layerThumbnails={layerThumbnails}
              isVisible={showLayerPanel}
              onTogglePanelVisible={() => setShowLayerPanel((v) => !v)}
              selectedLayerIds={selectedLayerIds}
              onSelectedLayersChange={setSelectedLayerIds}
              onLayerTransformClick={handleLayerTransformClick}
            />
          </div>

          {/* Empty-layer toast — shown when user tries to transform an empty layer */}
          {layerEmptyToastVisible && (
            <div
              data-ocid="layer_transform.empty_state"
              style={{
                position: "fixed",
                bottom: 56,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(30,24,48,0.96)",
                border: `1px solid ${uiAccent.accentBorder}`,
                borderRadius: 10,
                padding: "8px 18px",
                fontSize: 12,
                fontWeight: 600,
                color: uiAccent.accent,
                pointerEvents: "none",
                zIndex: 9999,
                boxShadow: "0 4px 20px rgba(0,0,0,0.55)",
                letterSpacing: "0.02em",
                animation: "float-in 0.2s ease-out",
              }}
            >
              Layer is empty — draw something first
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              padding: "4px 0",
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              background:
                colorTheme === "light"
                  ? "#e0e0e8"
                  : colorTheme === "purple"
                    ? "#0a0617"
                    : "#0a0a0d",
            }}
          >
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Built with{" "}
              <Heart
                size={10}
                style={{ display: "inline", verticalAlign: "middle" }}
              />{" "}
              using caffeine.ai
            </a>
          </div>
        </div>
      )}
    </>
  );
}
