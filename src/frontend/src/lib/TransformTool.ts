/**
 * TransformTool.ts — dual-export module.
 *
 * 1. VectorTransformTool  (NEW) — class-based, operates on Stroke[] Point[]
 *    arrays. All transform math in LOCAL (unrotated) coordinate space.
 *    Callbacks deliver Stroke[] on every frame for live re-render via drawStroke().
 *
 * 2. TransformTool  (LEGACY) — original class that renders an overlay on a
 *    canvas, now delegates state management to VectorTransformTool internally.
 *    Kept for backward compat with TransformOverlay.tsx / TransformToolPanel.tsx.
 *
 * Math convention:
 *   - "world" = canvas pixel space (may be rotated if bounding box is rotated)
 *   - "local" = bounding-box-aligned un-rotated space
 *   All resize/rotate deltas are computed in local space then re-applied.
 *   This eliminates handle-jitter at any rotation angle.
 */

// ─── Stroke / Point interfaces (mirror DrawingCanvas.tsx) ────────────────────

export interface Point {
  x: number;
  y: number;
}

export type BrushShape =
  | "circle"
  | "square"
  | "rectangle"
  | "triangle"
  | "diamond"
  | "star"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "cross"
  | "arrow"
  | "heart";

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  isEraser: boolean;
  shape: BrushShape;
  opacity: number;
  eraserSoftness?: "hard" | "soft";
  hardness?: number;
  vectorShape?: {
    type: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  fillData?: ImageData;
}

// ─── VectorTransformState ────────────────────────────────────────────────────

/**
 * Describes which points within a single stroke are selected for transform.
 * When pointIndices is undefined/empty all points in the stroke are transformed.
 */
export interface PartialStrokeSelection {
  strokeIndex: number;
  /** Indices of the specific points within the stroke that are selected.
   *  If undefined or empty, ALL points in the stroke are transformed. */
  pointIndices?: number[];
}

/**
 * Full transform state for the vector transform engine.
 * x, y, width, height describe the bounding box of the ORIGINAL (pre-transform)
 * stroke geometry in canvas-space.
 * pivotX, pivotY are absolute canvas coordinates.
 */
export interface VectorTransformState {
  // Bounding box (canvas-space, logical pixels)
  x: number;
  y: number;
  width: number;
  height: number;

  // Rotation (degrees, 0–360)
  angle: number;

  // Scale factors (1 = no change)
  scaleX: number;
  scaleY: number;

  // Skew (degrees)
  skewX: number;
  skewY: number;

  // Flip flags
  flipH: boolean;
  flipV: boolean;

  // Pivot point (absolute canvas coords, default = bounding box center)
  pivotX: number;
  pivotY: number;

  /**
   * Pivot lock state.
   * When true, pivot is always re-calculated to the center of the selection.
   * Set to false when the user manually drags the pivot handle.
   */
  pivotLocked: boolean;

  // Which strokes (by index in the original array) are selected
  selectedStrokeIndices: number[];

  /**
   * Per-stroke partial point selection.
   * When provided, only the listed point indices within each stroke are
   * transformed — all other points remain at their original positions.
   * When absent, every point in every selectedStroke is transformed.
   */
  partialStrokeSelections?: PartialStrokeSelection[];

  // Options
  snapEnabled: boolean;
  gridSize: number;
  aspectLocked: boolean;
}

// ─── VectorTransformOptions ───────────────────────────────────────────────────

export interface VectorTransformOptions {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  /** Called every animation frame while a handle is being dragged. */
  onTransformUpdate: (
    transformedStrokes: Stroke[],
    state: VectorTransformState,
  ) => void;
  /** Called when user confirms (Enter / ✓). */
  onConfirm: (
    transformedStrokes: Stroke[],
    state: VectorTransformState,
  ) => void;
  /** Called when user cancels (Escape / ✕). */
  onCancel: () => void;
  /** Optional sibling bounding boxes for object-edge snapping. */
  siblingBounds?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

// ─── Legacy types (kept for TransformOverlay / TransformToolPanel) ────────────

export interface TransformState {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  flipH: boolean;
  flipV: boolean;
  pivotX: number;
  pivotY: number;
  layerIds: number[];
  originalImageData: ImageData[];
  snapEnabled: boolean;
  gridSize: number;
  aspectLocked: boolean;
  // Legacy compat
  layerId?: number;
  maintainAspectRatio?: boolean;
  originalData?: Map<number, ImageData>;
  selectedLayerIds?: number[];
}

export interface SiblingBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformToolOptions {
  onTransform: (state: TransformState) => void;
  onConfirm: (state: TransformState) => void;
  onCancel: () => void;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  siblingBounds?: SiblingBounds[];
}

// ─── Shared constants ─────────────────────────────────────────────────────────

const HANDLE_RADIUS = 6;
const HANDLE_RADIUS_HOVER = 8;
const TOUCH_HIT_RADIUS = 20;
const MOUSE_HIT_RADIUS = 10;
const ROTATE_OFFSET = 28;
const SNAP_THRESHOLD = 10;
const ANGLE_SNAP_THRESHOLD = 5;
const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315, 360];
const MIN_SIZE = 4;

// ─── Math helpers ─────────────────────────────────────────────────────────────

function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  angleDeg: number,
): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

function worldToLocal(
  wx: number,
  wy: number,
  pivotX: number,
  pivotY: number,
  angleDeg: number,
): [number, number] {
  return rotatePoint(wx, wy, pivotX, pivotY, -angleDeg);
}

function localToWorld(
  lx: number,
  ly: number,
  pivotX: number,
  pivotY: number,
  angleDeg: number,
): [number, number] {
  return rotatePoint(lx, ly, pivotX, pivotY, angleDeg);
}

function snapToGrid(v: number, gridSize: number): number {
  return Math.round(v / gridSize) * gridSize;
}

function snapAngle(angle: number, shiftHeld: boolean): number {
  const normalized = ((angle % 360) + 360) % 360;
  if (shiftHeld) return Math.round(normalized / 45) * 45;
  for (const target of SNAP_ANGLES) {
    if (Math.abs(normalized - target) <= ANGLE_SNAP_THRESHOLD) return target;
  }
  return normalized;
}

/** Compute the axis-aligned bounding box of a set of strokes. */
function computeStrokeBounds(
  strokes: Stroke[],
): { x: number; y: number; width: number; height: number } | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let hasPoints = false;

  for (const s of strokes) {
    // Vector shapes
    if (s.vectorShape) {
      const { x1, y1, x2, y2 } = s.vectorShape;
      const lx = Math.min(x1, x2);
      const ly = Math.min(y1, y2);
      const hx = Math.max(x1, x2);
      const hy = Math.max(y1, y2);
      if (lx < minX) minX = lx;
      if (ly < minY) minY = ly;
      if (hx > maxX) maxX = hx;
      if (hy > maxY) maxY = hy;
      hasPoints = true;
      continue;
    }
    // Fill data — skip (no meaningful point geometry)
    if (s.fillData) continue;
    // Stroke points
    for (const p of s.points) {
      const r = s.size / 2;
      if (p.x - r < minX) minX = p.x - r;
      if (p.y - r < minY) minY = p.y - r;
      if (p.x + r > maxX) maxX = p.x + r;
      if (p.y + r > maxY) maxY = p.y + r;
      hasPoints = true;
    }
  }

  if (!hasPoints) return null;
  return {
    x: minX,
    y: minY,
    width: Math.max(MIN_SIZE, maxX - minX),
    height: Math.max(MIN_SIZE, maxY - minY),
  };
}

/** Deep-clone a Stroke array (preserving Point[] immutability). */
function cloneStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.map((s) => ({
    ...s,
    points: s.points.map((p) => ({ ...p })),
    vectorShape: s.vectorShape ? { ...s.vectorShape } : undefined,
    // fillData is an ImageData — copy the pixel buffer
    fillData: s.fillData
      ? new ImageData(
          new Uint8ClampedArray(s.fillData.data),
          s.fillData.width,
          s.fillData.height,
        )
      : undefined,
  }));
}

// ─── VectorTransformTool ─────────────────────────────────────────────────────

type ActiveHandle =
  | "move"
  | "nw"
  | "n"
  | "ne"
  | "w"
  | "e"
  | "sw"
  | "s"
  | "se"
  | "rotate"
  | "pivot"
  | null;

interface HandlePos {
  id: ActiveHandle;
  wx: number;
  wy: number;
}

interface SnapGuide {
  x?: number;
  y?: number;
}

/**
 * VectorTransformTool — core vector stroke transform engine.
 *
 * Workflow:
 *   1. Call `activate(strokes, selectedIndices)` when transform tool is selected.
 *      The tool auto-computes the bounding box and deep-clones the strokes.
 *   2. The overlay canvas receives pointer/keyboard events.
 *      Each drag frame the tool applies the current transform matrix to the
 *      original stroke Point[] and emits onTransformUpdate(transformedStrokes).
 *   3. On Enter/✓ → onConfirm(transformedStrokes, state).
 *   4. On Escape/✕ → onCancel() (caller should restore original strokes).
 */
export class VectorTransformTool {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: VectorTransformOptions;

  // State
  private state: VectorTransformState | null = null;
  /**
   * Display state used for LERP animation.
   * The render loop advances displayState toward state each frame.
   * Hit-testing always uses `state` (instant) for accuracy; only rendering lags.
   */
  private displayState: VectorTransformState | null = null;
  /** Deep-cloned originals — never mutated after activate(). */
  private originalStrokes: Stroke[] = [];
  /** Working copy updated every frame with the current transform applied. */
  private transformedStrokes: Stroke[] = [];

  // RAF
  private rafId = 0;
  /** LERP factor — how quickly display catches target (0.1 = smooth, 1 = instant) */
  private readonly LERP = 0.13;

  // Drag state
  private activeHandle: ActiveHandle = null;
  private activePointerId: number | null = null;
  private dragStartWorld: [number, number] = [0, 0];
  private dragStartLocal: [number, number] = [0, 0];
  private dragStartState: VectorTransformState | null = null;
  private hoverHandle: ActiveHandle = null;

  /**
   * Cached original points per stroke — captured on pointerdown (drag start).
   * All transforms are applied relative to these originals to avoid accumulation.
   * Cleared on pointerup.
   */
  private cachedOriginalPoints: Stroke[] = [];
  private hasCachedOriginals = false;

  // Performance: debounce pointermove to ~60fps
  private lastFrameTime = 0;

  // Two-finger gesture state
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartAngle = 0;
  private pinchStartState: VectorTransformState | null = null;

  // Keyboard modifiers
  private shiftHeld = false;
  private ctrlHeld = false;
  private altHeld = false;

  // Snap guides for current frame
  private snapGuides: SnapGuide[] = [];

  // Cached handle positions
  private handles: HandlePos[] = [];
  private rotateHandle: HandlePos = { id: "rotate", wx: 0, wy: 0 };

  // Bound event handlers
  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerMove: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;
  private readonly _onDblClick: (e: MouseEvent) => void;
  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, opts: VectorTransformOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("VectorTransformTool: no 2D context");
    this.ctx = ctx;
    this.opts = opts;

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onDblClick = this.onDblClick.bind(this);
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);

    canvas.addEventListener("pointerdown", this._onPointerDown);
    canvas.addEventListener("pointermove", this._onPointerMove);
    canvas.addEventListener("pointerup", this._onPointerUp);
    canvas.addEventListener("pointercancel", this._onPointerUp);
    canvas.addEventListener("dblclick", this._onDblClick);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);

    this.scheduleRender();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Activate the transform tool on a set of strokes.
   * Auto-groups all provided strokes — no manual selection required.
   * @param allStrokes  Full strokes array from the active layer
   * @param indices     Which stroke indices to transform. Pass [] to transform all.
   * @param partialSelections  Optional per-stroke point selections for partial transform.
   */
  activate(
    allStrokes: Stroke[],
    indices?: number[],
    partialSelections?: PartialStrokeSelection[],
  ): void {
    const selectedIndices =
      indices && indices.length > 0 ? indices : allStrokes.map((_, i) => i);

    // Determine which points to include for bounding box computation.
    // When partial selections exist, only those points contribute to the bounds.
    const selectedForBounds: Stroke[] = selectedIndices.map((i) => {
      const s = allStrokes[i];
      if (!partialSelections) return s;
      const sel = partialSelections.find((ps) => ps.strokeIndex === i);
      if (!sel || !sel.pointIndices || sel.pointIndices.length === 0) return s;
      // Return a synthetic stroke with only the selected points for bounds calc
      return { ...s, points: sel.pointIndices.map((pi) => s.points[pi]) };
    });

    const bounds = computeStrokeBounds(selectedForBounds);

    if (!bounds) {
      // Nothing to transform
      this.state = null;
      return;
    }

    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    this.originalStrokes = cloneStrokes(allStrokes);
    this.transformedStrokes = cloneStrokes(allStrokes);

    this.state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      flipH: false,
      flipV: false,
      pivotX: cx,
      pivotY: cy,
      pivotLocked: true,
      selectedStrokeIndices: selectedIndices,
      partialStrokeSelections: partialSelections,
      snapEnabled: false,
      gridSize: 10,
      aspectLocked: false,
    };
    // Initialize display state = actual state (no animation lag at start)
    this.displayState = { ...this.state };
    // Reset cached originals on new activation
    this.cachedOriginalPoints = [];
    this.hasCachedOriginals = false;
  }

  /** Deactivate — clears the overlay canvas. */
  deactivate(): void {
    this.state = null;
    this.displayState = null;
    this.originalStrokes = [];
    this.transformedStrokes = [];
    this.activeHandle = null;
    this.snapGuides = [];
    this.cachedOriginalPoints = [];
    this.hasCachedOriginals = false;
  }

  getState(): VectorTransformState | null {
    return this.state;
  }

  setState(state: VectorTransformState | null): void {
    this.state = state;
    // Also sync display state immediately when state is set externally
    // (e.g., from panel inputs — we still want instant response)
    if (state) {
      this.displayState = { ...state };
      this.applyTransformToStrokes(state);
    }
  }

  setOptions(opts: Partial<VectorTransformOptions>): void {
    this.opts = { ...this.opts, ...opts };
  }

  /** Returns the current working (transformed) copy of all strokes. */
  getTransformedStrokes(): Stroke[] {
    return this.transformedStrokes;
  }

  /**
   * Set pivotLocked flag directly (called from overlay when user grabs pivot handle).
   * When locked=false the pivot can move freely.
   */
  setPivotLocked(locked: boolean): void {
    if (!this.state) return;
    this.state = { ...this.state, pivotLocked: locked };
    if (this.displayState)
      this.displayState = { ...this.displayState, pivotLocked: locked };
  }

  /**
   * Reset pivot to the bounding-box center and re-enable locking.
   * Exposed as a public API so the TransformPanel "Reset Pivot" button can call it.
   */
  resetPivot(): void {
    if (!this.state) return;
    const cx = this.state.x + this.state.width / 2;
    const cy = this.state.y + this.state.height / 2;
    this.applyVectorState({
      ...this.state,
      pivotX: cx,
      pivotY: cy,
      pivotLocked: true,
    });
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("pointercancel", this._onPointerUp);
    this.canvas.removeEventListener("dblclick", this._onDblClick);
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ─── Vector math: apply transform matrix to stroke points ───────────────────

  /**
   * Builds a 2×2 linear transform (scale + skew + flip) plus a pivot
   * translation, then maps every Point in every selected stroke through it.
   *
   * The transform matrix T applied to a point P relative to pivot is:
   *   P' = pivot + R * S * K * F * (P - pivot)
   * where:
   *   R = rotation matrix (angle)
   *   S = scale matrix (scaleX, scaleY)
   *   K = skew matrix (skewX, skewY)
   *   F = flip matrix (+1 or -1 on each axis)
   *
   * But since we want the bounding box x,y,w,h to define where the content
   * lives in canvas space (representing the INITIAL geometry), we store
   * scaleX/scaleY as ratios of new-width/orig-width rather than multipliers
   * relative to initial identity. This way the resize handles directly control
   * the bounding box dimensions.
   *
   * Implementation: for each selected stroke, compute each point's position
   * relative to the original bounding box center, apply scale + skew + flip,
   * then rotate, then translate to the new bounding box position.
   */
  private applyTransformToStrokes(state: VectorTransformState): void {
    const {
      width: w,
      height: h,
      angle,
      scaleX,
      scaleY,
      skewX,
      skewY,
      flipH,
      flipV,
      pivotX,
      pivotY,
      selectedStrokeIndices,
      partialStrokeSelections,
    } = state;

    // Compute bounds from ORIGINAL selected content (points that are selected)
    const selectedForBounds: Stroke[] = selectedStrokeIndices.map((i) => {
      const s = this.originalStrokes[i];
      if (!partialStrokeSelections) return s;
      const sel = partialStrokeSelections.find((ps) => ps.strokeIndex === i);
      if (!sel || !sel.pointIndices || sel.pointIndices.length === 0) return s;
      return { ...s, points: sel.pointIndices.map((pi) => s.points[pi]) };
    });

    const origBounds = computeStrokeBounds(selectedForBounds);
    if (!origBounds) return;

    const origCx = origBounds.x + origBounds.width / 2;
    const origCy = origBounds.y + origBounds.height / 2;

    // Effective scale from original bbox size to current state size
    const sx = origBounds.width > 0 ? (w * scaleX) / origBounds.width : 1;
    const sy = origBounds.height > 0 ? (h * scaleY) / origBounds.height : 1;

    // Skew radians
    const skewXRad = (skewX * Math.PI) / 180;
    const skewYRad = (skewY * Math.PI) / 180;

    // Rotation — precompute sin/cos ONCE per frame (not inside point loop)
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Flip multipliers
    const fx = flipH ? -1 : 1;
    const fy = flipV ? -1 : 1;

    // New bounding box center (where the content center should land)
    const newCx = pivotX;
    const newCy = pivotY;

    const transformIndex = new Set(selectedStrokeIndices);

    // Build a map from strokeIndex → Set of pointIndices for O(1) lookup
    const partialMap = new Map<number, Set<number>>();
    if (partialStrokeSelections) {
      for (const sel of partialStrokeSelections) {
        if (sel.pointIndices && sel.pointIndices.length > 0) {
          partialMap.set(sel.strokeIndex, new Set(sel.pointIndices));
        }
      }
    }

    for (let i = 0; i < this.transformedStrokes.length; i++) {
      if (!transformIndex.has(i)) {
        // Non-selected strokes: copy from original unchanged
        const orig = this.originalStrokes[i];
        const t = this.transformedStrokes[i];
        t.points = orig.points.map((p) => ({ ...p }));
        if (orig.vectorShape) t.vectorShape = { ...orig.vectorShape };
        continue;
      }

      const orig = this.originalStrokes[i];
      const transformed = this.transformedStrokes[i];

      // Transform a single point through the full chain
      const transformPoint = (px: number, py: number): [number, number] => {
        // 1. Translate to origin relative to original bbox center
        let lx = px - origCx;
        let ly = py - origCy;

        // 2. Scale
        lx *= sx;
        ly *= sy;

        // 3. Skew (applied before flip so flip is always clean)
        const slx = lx + ly * Math.tan(skewXRad);
        const sly = ly + lx * Math.tan(skewYRad);
        lx = slx;
        ly = sly;

        // 4. Flip
        lx *= fx;
        ly *= fy;

        // 5. Rotate around origin
        const rx = lx * cos - ly * sin;
        const ry = lx * sin + ly * cos;

        // 6. Translate to new center
        return [rx + newCx, ry + newCy];
      };

      // Check if this stroke has partial point selection
      const selectedPoints = partialMap.get(i);

      if (selectedPoints) {
        // PARTIAL SELECTION: only transform the selected point indices;
        // all other points stay at their original positions.
        transformed.points = orig.points.map((p, pi) => {
          if (!selectedPoints.has(pi)) return { ...p };
          const [nx, ny] = transformPoint(p.x, p.y);
          return { x: nx, y: ny };
        });
      } else {
        // Full stroke transform
        transformed.points = orig.points.map((p) => {
          const [nx, ny] = transformPoint(p.x, p.y);
          return { x: nx, y: ny };
        });
      }

      // Transform stroke size (scale uniformly)
      const avgScale = Math.sqrt(Math.abs(sx * sy));
      transformed.size = orig.size * avgScale;

      // Transform vectorShape coordinates
      if (orig.vectorShape) {
        const [nx1, ny1] = transformPoint(
          orig.vectorShape.x1,
          orig.vectorShape.y1,
        );
        const [nx2, ny2] = transformPoint(
          orig.vectorShape.x2,
          orig.vectorShape.y2,
        );
        transformed.vectorShape = {
          ...orig.vectorShape,
          x1: nx1,
          y1: ny1,
          x2: nx2,
          y2: ny2,
        };
      }

      // fillData: raster — cannot be vector-transformed. Keep unchanged.
    }
  }

  // ─── Bounding box helper ──────────────────────────────────────────────────

  private computeHandles(s: VectorTransformState): {
    handles: HandlePos[];
    rotateHandle: HandlePos;
  } {
    const { x, y, width: w, height: h, angle, pivotX, pivotY } = s;

    const localPoints: { id: ActiveHandle; lx: number; ly: number }[] = [
      { id: "nw", lx: x, ly: y },
      { id: "n", lx: x + w / 2, ly: y },
      { id: "ne", lx: x + w, ly: y },
      { id: "w", lx: x, ly: y + h / 2 },
      { id: "e", lx: x + w, ly: y + h / 2 },
      { id: "sw", lx: x, ly: y + h },
      { id: "s", lx: x + w / 2, ly: y + h },
      { id: "se", lx: x + w, ly: y + h },
    ];

    const handles: HandlePos[] = localPoints.map(({ id, lx, ly }) => {
      const [wx, wy] = localToWorld(lx, ly, pivotX, pivotY, angle);
      return { id, wx, wy };
    });

    const nHandle = handles.find((hp) => hp.id === "n")!;
    const angleRad = (angle * Math.PI) / 180;
    const rotateHandle: HandlePos = {
      id: "rotate",
      wx: nHandle.wx - Math.sin(angleRad) * ROTATE_OFFSET,
      wy: nHandle.wy - Math.cos(angleRad) * ROTATE_OFFSET,
    };

    return { handles, rotateHandle };
  }

  // ─── Hit testing ─────────────────────────────────────────────────────────

  private hitTest(wx: number, wy: number, isTouch: boolean): ActiveHandle {
    if (!this.state) return null;
    const hitR = isTouch ? TOUCH_HIT_RADIUS : MOUSE_HIT_RADIUS;

    if (Math.hypot(wx - this.rotateHandle.wx, wy - this.rotateHandle.wy) < hitR)
      return "rotate";

    const { pivotX, pivotY } = this.state;
    if (Math.hypot(wx - pivotX, wy - pivotY) < hitR) return "pivot";

    for (const hp of this.handles) {
      if (Math.hypot(wx - hp.wx, wy - hp.wy) < hitR) return hp.id;
    }

    const { x, y, width: bw, height: bh, angle } = this.state;
    const [lx, ly] = worldToLocal(wx, wy, pivotX, pivotY, angle);
    if (lx >= x && lx <= x + bw && ly >= y && ly <= y + bh) return "move";

    return null;
  }

  // ─── Cursor ───────────────────────────────────────────────────────────────

  private getCursor(handle: ActiveHandle): string {
    if (!handle) return "default";
    if (handle === "rotate") return "grab";
    if (handle === "pivot") return "crosshair";
    if (handle === "move") return "move";

    const angle = this.state?.angle ?? 0;
    const step = ((Math.round(angle / 45) % 8) + 8) % 8;
    const order = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    const baseIdx: Record<string, number> = {
      nw: 0,
      n: 1,
      ne: 2,
      e: 3,
      se: 4,
      s: 5,
      sw: 6,
      w: 7,
    };
    if (handle in baseIdx) {
      const rotated = order[(baseIdx[handle] + step) % 8];
      return `${rotated}-resize`;
    }
    return "default";
  }

  // ─── Snapping ─────────────────────────────────────────────────────────────

  private snapXY(
    x: number,
    y: number,
    w: number,
    h: number,
  ): { x: number; y: number; guides: SnapGuide[] } {
    if (!this.state?.snapEnabled) return { x, y, guides: [] };
    const { gridSize } = this.state;
    const { canvasWidth, canvasHeight, siblingBounds = [] } = this.opts;
    const guides: SnapGuide[] = [];

    let sx = x;
    let sy = y;

    const trySnapX = (val: number, target: number) => {
      if (Math.abs(val - target) < SNAP_THRESHOLD) {
        guides.push({ x: target });
        return target;
      }
      return val;
    };
    const trySnapY = (val: number, target: number) => {
      if (Math.abs(val - target) < SNAP_THRESHOLD) {
        guides.push({ y: target });
        return target;
      }
      return val;
    };

    sx = trySnapX(sx, snapToGrid(sx, gridSize));
    sy = trySnapY(sy, snapToGrid(sy, gridSize));
    sx = trySnapX(sx, 0);
    sx = trySnapX(sx + w, canvasWidth) - w;
    sx = trySnapX(sx + w / 2, canvasWidth / 2) - w / 2;
    sy = trySnapY(sy, 0);
    sy = trySnapY(sy + h, canvasHeight) - h;
    sy = trySnapY(sy + h / 2, canvasHeight / 2) - h / 2;

    for (const sb of siblingBounds) {
      sx = trySnapX(sx, sb.x);
      sx = trySnapX(sx, sb.x + sb.width);
      sx = trySnapX(sx + w, sb.x) - w;
      sx = trySnapX(sx + w, sb.x + sb.width) - w;
      sx = trySnapX(sx + w / 2, sb.x + sb.width / 2) - w / 2;
      sy = trySnapY(sy, sb.y);
      sy = trySnapY(sy, sb.y + sb.height);
      sy = trySnapY(sy + h, sb.y) - h;
      sy = trySnapY(sy + h, sb.y + sb.height) - h;
      sy = trySnapY(sy + h / 2, sb.y + sb.height / 2) - h / 2;
    }

    return { x: sx, y: sy, guides };
  }

  // ─── Coordinate conversion ────────────────────────────────────────────────

  private clientToCanvas(clientX: number, clientY: number): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const zf = this.opts.zoom / 100;
    return [(clientX - rect.left) / zf, (clientY - rect.top) / zf];
  }

  // ─── Pointer events ───────────────────────────────────────────────────────

  private onPointerDown(e: PointerEvent): void {
    if (!this.state) return;
    const [wx, wy] = this.clientToCanvas(e.clientX, e.clientY);
    const isTouch = e.pointerType === "touch";

    this.pointers.set(e.pointerId, { x: wx, y: wy });

    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      this.pinchStartDist = Math.hypot(
        pts[1].x - pts[0].x,
        pts[1].y - pts[0].y,
      );
      this.pinchStartAngle =
        Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * (180 / Math.PI);
      this.pinchStartState = { ...this.state };
      this.activeHandle = null;
      return;
    }

    const hit = this.hitTest(wx, wy, isTouch);
    if (!hit) return;

    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.activePointerId = e.pointerId;
    this.activeHandle = hit;
    this.dragStartWorld = [wx, wy];
    this.dragStartState = { ...this.state };

    const { pivotX, pivotY, angle } = this.state;
    this.dragStartLocal = worldToLocal(wx, wy, pivotX, pivotY, angle);

    // Cache original positions before transform begins — all transforms are
    // applied relative to these originals to avoid accumulation drift
    if (!this.hasCachedOriginals) {
      this.cachedOriginalPoints = cloneStrokes(this.originalStrokes);
      this.hasCachedOriginals = true;
    }

    // When user grabs the pivot handle, unlock the pivot so it moves freely
    if (hit === "pivot" && this.state.pivotLocked) {
      this.state = { ...this.state, pivotLocked: false };
      if (this.displayState)
        this.displayState = { ...this.displayState, pivotLocked: false };
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.state) return;
    const [wx, wy] = this.clientToCanvas(e.clientX, e.clientY);
    const isTouch = e.pointerType === "touch";

    if (this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, { x: wx, y: wy });
    }

    if (this.pointers.size >= 2 && this.pinchStartState) {
      this.handlePinch();
      return;
    }

    if (this.activeHandle === null || this.activePointerId !== e.pointerId) {
      const hit = this.hitTest(wx, wy, isTouch);
      if (hit !== this.hoverHandle) {
        this.hoverHandle = hit;
        this.canvas.style.cursor = this.getCursor(hit);
      }
      return;
    }

    // Debounce to ~60fps — skip frames that arrive faster than 16ms
    const now = performance.now();
    if (now - this.lastFrameTime < 16) return;
    this.lastFrameTime = now;

    e.preventDefault();
    const ts = this.dragStartState!;
    const { pivotX, pivotY, angle } = ts;

    const [lx, ly] = worldToLocal(wx, wy, pivotX, pivotY, angle);
    const dLocal: [number, number] = [
      lx - this.dragStartLocal[0],
      ly - this.dragStartLocal[1],
    ];

    switch (this.activeHandle) {
      case "move":
        this.handleMove(wx, wy, ts);
        break;
      case "rotate":
        this.handleRotate(wx, wy, ts);
        break;
      case "pivot":
        this.handlePivotMove(wx, wy);
        break;
      default:
        this.handleResize(this.activeHandle, dLocal, ts);
        break;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    this.pinchStartState = null;

    if (this.activePointerId !== e.pointerId) return;
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    this.activeHandle = null;
    this.activePointerId = null;
    this.snapGuides = [];
    this.canvas.style.cursor = "default";

    // Save undo snapshot only on pointer up, not during drag
    // Clear cached originals so next drag re-caches current (post-transform) positions
    this.cachedOriginalPoints = [];
    this.hasCachedOriginals = false;
  }

  private onDblClick(e: MouseEvent): void {
    if (!this.state) return;
    const [wx, wy] = this.clientToCanvas(e.clientX, e.clientY);
    const rh = this.rotateHandle;
    if (Math.hypot(wx - rh.wx, wy - rh.wy) < MOUSE_HIT_RADIUS * 1.5) {
      this.applyVectorState({ ...this.state, angle: 0 });
    }
  }

  // ─── Gesture handlers ────────────────────────────────────────────────────

  private handleMove(wx: number, wy: number, ts: VectorTransformState): void {
    const [startWx, startWy] = this.dragStartWorld;
    const dx = wx - startWx;
    const dy = wy - startWy;
    const rawX = ts.x + dx;
    const rawY = ts.y + dy;

    const {
      x: sx,
      y: sy,
      guides,
    } = this.snapXY(rawX, rawY, ts.width, ts.height);
    this.snapGuides = guides;

    const pivotDx = sx - ts.x;
    const pivotDy = sy - ts.y;

    // If pivot is locked, keep it at selection center during move
    const newPivotX = ts.pivotLocked ? sx + ts.width / 2 : ts.pivotX + pivotDx;
    const newPivotY = ts.pivotLocked ? sy + ts.height / 2 : ts.pivotY + pivotDy;

    this.applyVectorState({
      ...this.state!,
      x: sx,
      y: sy,
      pivotX: newPivotX,
      pivotY: newPivotY,
    });
  }

  private handleRotate(wx: number, wy: number, ts: VectorTransformState): void {
    const { pivotX, pivotY } = ts;
    const rawAngle =
      Math.atan2(wy - pivotY, wx - pivotX) * (180 / Math.PI) + 90;
    const snapped = snapAngle(rawAngle, this.shiftHeld);

    // When pivot is locked, recalculate pivot to center on every rotation frame
    const newState = { ...this.state!, angle: snapped };
    if (newState.pivotLocked) {
      newState.pivotX = newState.x + newState.width / 2;
      newState.pivotY = newState.y + newState.height / 2;
    }
    this.applyVectorState(newState);
  }

  private handlePivotMove(wx: number, wy: number): void {
    // pivotLocked is already set to false in onPointerDown when pivot handle is grabbed
    this.applyVectorState({
      ...this.state!,
      pivotX: wx,
      pivotY: wy,
      pivotLocked: false,
    });
  }

  private handleResize(
    handle: string,
    dLocal: [number, number],
    ts: VectorTransformState,
  ): void {
    const [dlx, dly] = dLocal;
    const { x, y, width: w, height: h, pivotX, pivotY, angle } = ts;
    const lockAspect = ts.aspectLocked || this.shiftHeld;
    const ar = h > 0 ? w / h : 1;

    // Skew mode: Ctrl + N/S edges = skewX, E/W edges = skewY
    if (this.ctrlHeld) {
      if (handle === "n" || handle === "s") {
        const delta = (dlx / Math.max(w, 1)) * 90;
        this.applyVectorState({ ...this.state!, skewX: ts.skewX + delta });
        return;
      }
      if (handle === "e" || handle === "w") {
        const delta = (dly / Math.max(h, 1)) * 90;
        this.applyVectorState({ ...this.state!, skewY: ts.skewY + delta });
        return;
      }
    }

    // Alt = scale from center (symmetric resize)
    const fromCenter = this.altHeld;

    let newX = x;
    let newY = y;
    let newW = w;
    let newH = h;

    switch (handle) {
      case "se":
        newW = Math.max(MIN_SIZE, w + dlx);
        newH = lockAspect ? newW / ar : Math.max(MIN_SIZE, h + dly);
        if (fromCenter) {
          newX = x - (newW - w) / 2;
          newY = y - (newH - h) / 2;
        }
        break;
      case "sw":
        newW = Math.max(MIN_SIZE, w - dlx);
        newH = lockAspect ? newW / ar : Math.max(MIN_SIZE, h + dly);
        newX = x + (w - newW);
        if (fromCenter) {
          newX = x - (newW - w) / 2;
          newY = y - (newH - h) / 2;
        }
        break;
      case "ne":
        newW = Math.max(MIN_SIZE, w + dlx);
        newH = lockAspect ? newW / ar : Math.max(MIN_SIZE, h - dly);
        newY = y + (h - newH);
        if (fromCenter) {
          newX = x - (newW - w) / 2;
          newY = y - (newH - h) / 2;
        }
        break;
      case "nw":
        newW = Math.max(MIN_SIZE, w - dlx);
        newH = lockAspect ? newW / ar : Math.max(MIN_SIZE, h - dly);
        newX = x + (w - newW);
        newY = y + (h - newH);
        if (fromCenter) {
          newX = x - (newW - w) / 2;
          newY = y - (newH - h) / 2;
        }
        break;
      case "e":
        newW = Math.max(MIN_SIZE, w + dlx);
        if (fromCenter) {
          newX = x - (newW - w) / 2;
        }
        break;
      case "w":
        newW = Math.max(MIN_SIZE, w - dlx);
        newX = fromCenter ? x - (newW - w) / 2 : x + (w - newW);
        break;
      case "s":
        newH = Math.max(MIN_SIZE, h + dly);
        if (fromCenter) {
          newY = y - (newH - h) / 2;
        }
        break;
      case "n":
        newH = Math.max(MIN_SIZE, h - dly);
        newY = fromCenter ? y - (newH - h) / 2 : y + (h - newH);
        break;
    }

    // Pin world-space center to prevent rotation-center drift during resize
    const oldCx = x + w / 2;
    const oldCy = y + h / 2;
    const [oldCWx, oldCWy] = localToWorld(oldCx, oldCy, pivotX, pivotY, angle);

    const newCLx = newX + newW / 2;
    const newCLy = newY + newH / 2;
    const [tentWx, tentWy] = localToWorld(
      newCLx,
      newCLy,
      pivotX,
      pivotY,
      angle,
    );

    // If pivot is locked, always keep it at the new bounding box center
    const newPivotX = ts.pivotLocked
      ? newX + newW / 2
      : pivotX + (oldCWx - tentWx);
    const newPivotY = ts.pivotLocked
      ? newY + newH / 2
      : pivotY + (oldCWy - tentWy);

    this.applyVectorState({
      ...this.state!,
      x: newX,
      y: newY,
      width: newW,
      height: newH,
      pivotX: newPivotX,
      pivotY: newPivotY,
    });
  }

  private handlePinch(): void {
    if (!this.pinchStartState) return;
    const pts = Array.from(this.pointers.values());
    if (pts.length < 2) return;

    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const currAngle =
      Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * (180 / Math.PI);
    const scaleDelta = this.pinchStartDist > 0 ? dist / this.pinchStartDist : 1;
    const angleDelta = currAngle - this.pinchStartAngle;
    const ts = this.pinchStartState;

    const newW = Math.max(MIN_SIZE, ts.width * scaleDelta);
    const newH = Math.max(MIN_SIZE, ts.height * scaleDelta);
    const newAngle = (((ts.angle + angleDelta) % 360) + 360) % 360;

    this.applyVectorState({
      ...this.state!,
      width: newW,
      height: newH,
      angle: newAngle,
    });
  }

  // ─── Public flip/reset helpers ────────────────────────────────────────────

  flipH(): void {
    if (!this.state) return;
    this.applyVectorState({ ...this.state, flipH: !this.state.flipH });
  }

  flipV(): void {
    if (!this.state) return;
    this.applyVectorState({ ...this.state, flipV: !this.state.flipV });
  }

  resetTransform(): void {
    if (!this.state) return;
    const origBounds = computeStrokeBounds(
      this.state.selectedStrokeIndices.map((i) => this.originalStrokes[i]),
    );
    if (!origBounds) return;
    this.applyVectorState({
      ...this.state,
      x: origBounds.x,
      y: origBounds.y,
      width: origBounds.width,
      height: origBounds.height,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      flipH: false,
      flipV: false,
      pivotX: origBounds.x + origBounds.width / 2,
      pivotY: origBounds.y + origBounds.height / 2,
    });
  }

  // ─── Keyboard ────────────────────────────────────────────────────────────

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Shift") this.shiftHeld = true;
    if (e.key === "Control" || e.key === "Meta") this.ctrlHeld = true;
    if (e.key === "Alt") this.altHeld = true;

    if (!this.state) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.key === "Enter") {
      e.preventDefault();
      this.opts.onConfirm(this.transformedStrokes, this.state);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      this.opts.onCancel();
      return;
    }
    // [ ] keys: rotate by 1° (shift = 15°)
    if (e.key === "[") {
      e.preventDefault();
      const delta = e.shiftKey ? 15 : 1;
      this.applyVectorState({ ...this.state, angle: this.state.angle - delta });
      return;
    }
    if (e.key === "]") {
      e.preventDefault();
      const delta = e.shiftKey ? 15 : 1;
      this.applyVectorState({ ...this.state, angle: this.state.angle + delta });
      return;
    }
    // Arrow key nudge
    const step = e.shiftKey ? 10 : 1;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      dx = -step;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      dx = step;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      dy = -step;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      dy = step;
    }

    if (dx !== 0 || dy !== 0) {
      const s = this.state;
      this.applyVectorState({
        ...s,
        x: s.x + dx,
        y: s.y + dy,
        pivotX: s.pivotX + dx,
        pivotY: s.pivotY + dy,
      });
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === "Shift") this.shiftHeld = false;
    if (e.key === "Control" || e.key === "Meta") this.ctrlHeld = false;
    if (e.key === "Alt") this.altHeld = false;
  }

  // ─── State mutation + stroke application ─────────────────────────────────

  /**
   * Apply a new transform state (called on every drag frame).
   * `state` snaps instantly (used for hit-testing / math accuracy).
   * `displayState` LERP-tracks toward `state` in the render loop for smoothness.
   */
  private applyVectorState(newState: VectorTransformState): void {
    this.state = newState;
    this.applyTransformToStrokes(newState);
    this.opts.onTransformUpdate(this.transformedStrokes, newState);
  }

  // ─── LERP helper ─────────────────────────────────────────────────────────

  /** Advance displayState toward state by LERP factor. Returns updated display. */
  private advanceLerpDisplay(
    target: VectorTransformState,
  ): VectorTransformState {
    const d = this.displayState;
    if (!d) return { ...target };
    const L = this.LERP;
    const lerp = (a: number, b: number) => a + (b - a) * L;
    // Angle lerp with shortest-path wrapping
    let da = target.angle - d.angle;
    while (da > 180) da -= 360;
    while (da < -180) da += 360;
    return {
      ...target,
      x: lerp(d.x, target.x),
      y: lerp(d.y, target.y),
      width: lerp(d.width, target.width),
      height: lerp(d.height, target.height),
      angle: d.angle + da * L,
      scaleX: lerp(d.scaleX, target.scaleX),
      scaleY: lerp(d.scaleY, target.scaleY),
      skewX: lerp(d.skewX, target.skewX),
      skewY: lerp(d.skewY, target.skewY),
      pivotX: lerp(d.pivotX, target.pivotX),
      pivotY: lerp(d.pivotY, target.pivotY),
      // Booleans snap immediately
      flipH: target.flipH,
      flipV: target.flipV,
    };
  }

  // ─── RAF render loop ──────────────────────────────────────────────────────

  private scheduleRender(): void {
    this.rafId = requestAnimationFrame(() => {
      this.render();
      this.scheduleRender();
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  private render(): void {
    const { canvas, ctx } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.state) return;

    // Advance LERP display state toward actual state
    const prevDisplay = this.displayState;
    this.displayState = this.advanceLerpDisplay(this.state);

    // If the display state moved meaningfully (animation in progress),
    // also emit onTransformUpdate with LERP-smoothed stroke coordinates so the
    // stroke preview canvas is equally smooth (not just the bounding box overlay).
    const lerpMoved =
      prevDisplay &&
      (Math.abs(this.displayState.x - prevDisplay.x) > 0.1 ||
        Math.abs(this.displayState.y - prevDisplay.y) > 0.1 ||
        Math.abs(this.displayState.width - prevDisplay.width) > 0.1 ||
        Math.abs(this.displayState.height - prevDisplay.height) > 0.1 ||
        Math.abs(this.displayState.angle - prevDisplay.angle) > 0.05 ||
        Math.abs(this.displayState.scaleX - prevDisplay.scaleX) > 0.001 ||
        Math.abs(this.displayState.scaleY - prevDisplay.scaleY) > 0.001 ||
        Math.abs(this.displayState.pivotX - prevDisplay.pivotX) > 0.1 ||
        Math.abs(this.displayState.pivotY - prevDisplay.pivotY) > 0.1);

    // Only fire the smooth-preview callback when there's visible animation
    // AND no active drag (during drag we already fired per-event in applyVectorState)
    if (lerpMoved && this.activeHandle === null) {
      this.applyTransformToStrokes(this.displayState);
      this.opts.onTransformUpdate(this.transformedStrokes, this.displayState);
      // Restore transformedStrokes back to match actual state after LERP preview
      // so hit-testing / confirm use the real (non-lerped) positions
      this.applyTransformToStrokes(this.state);
    }

    // Use displayState for all VISUAL rendering (smooth animation)
    const s = this.displayState;
    const {
      x,
      y,
      width: w,
      height: h,
      angle,
      pivotX,
      pivotY,
      skewX,
      skewY,
    } = s;
    const angleRad = (angle * Math.PI) / 180;

    // Recompute handles every frame
    const { handles, rotateHandle } = this.computeHandles(s);
    this.handles = handles;
    this.rotateHandle = rotateHandle;

    // ── Snap guide lines ─────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = "rgba(59,130,246,0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    for (const g of this.snapGuides) {
      if (g.x !== undefined) {
        ctx.beginPath();
        ctx.moveTo(g.x, 0);
        ctx.lineTo(g.x, canvas.height);
        ctx.stroke();
      }
      if (g.y !== undefined) {
        ctx.beginPath();
        ctx.moveTo(0, g.y);
        ctx.lineTo(canvas.width, g.y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.restore();

    // ── Bounding box ─────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angleRad);
    if (skewX !== 0)
      ctx.transform(1, 0, Math.tan((skewX * Math.PI) / 180), 1, 0, 0);
    if (skewY !== 0)
      ctx.transform(1, Math.tan((skewY * Math.PI) / 180), 0, 1, 0, 0);

    const rx = x - pivotX;
    const ry = y - pivotY;

    ctx.fillStyle = "rgba(59,130,246,0.06)";
    ctx.fillRect(rx, ry, w, h);

    ctx.strokeStyle = "rgba(59,130,246,0.9)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(rx, ry, w, h);
    ctx.setLineDash([]);

    if (Math.abs(angle) > 0.4) {
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "rgba(59,130,246,0.9)";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(angle)}°`, rx + w / 2, ry - 10);
    }
    ctx.restore();

    // ── Rotation handle connector ──────────────────────────────────────
    const nHandle = handles.find((hp) => hp.id === "n")!;
    ctx.save();
    ctx.strokeStyle = "rgba(59,130,246,0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(nHandle.wx, nHandle.wy);
    ctx.lineTo(rotateHandle.wx, rotateHandle.wy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── Scale handles ─────────────────────────────────────────────────
    for (const hp of handles) {
      const isHover = this.hoverHandle === hp.id;
      const isActive = this.activeHandle === hp.id;
      const r = isHover || isActive ? HANDLE_RADIUS_HOVER : HANDLE_RADIUS;

      ctx.beginPath();
      ctx.arc(hp.wx, hp.wy, r, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = isActive ? "rgba(37,99,235,1)" : "rgba(59,130,246,0.9)";
      ctx.lineWidth = isHover || isActive ? 2 : 1.5;
      ctx.stroke();
    }

    // ── Rotation handle ───────────────────────────────────────────────
    {
      const rh = rotateHandle;
      const isHover = this.hoverHandle === "rotate";
      const isActive = this.activeHandle === "rotate";
      const r = isHover || isActive ? 11 : 9;

      ctx.beginPath();
      ctx.arc(rh.wx, rh.wy, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "rgba(59,130,246,0.18)" : "white";
      ctx.fill();
      ctx.strokeStyle = "rgba(59,130,246,0.9)";
      ctx.lineWidth = isActive ? 2 : 1.5;
      ctx.stroke();

      ctx.strokeStyle = "rgba(59,130,246,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rh.wx - 5, rh.wy);
      ctx.lineTo(rh.wx + 5, rh.wy);
      ctx.moveTo(rh.wx, rh.wy - 5);
      ctx.lineTo(rh.wx, rh.wy + 5);
      ctx.stroke();
    }

    // ── Pivot crosshair ──────────────────────────────────────────────
    {
      const px = pivotX;
      const py = pivotY;
      const isHover = this.hoverHandle === "pivot";
      const r = isHover ? 7 : 5;
      const pivotLocked = s.pivotLocked ?? true;

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,200,50,0.15)";
      ctx.fill();
      ctx.strokeStyle = pivotLocked
        ? "rgba(255,200,50,0.9)"
        : "rgba(255,140,50,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.strokeStyle = pivotLocked
        ? "rgba(255,200,50,0.85)"
        : "rgba(255,140,50,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 7, py);
      ctx.lineTo(px + 7, py);
      ctx.moveTo(px, py - 7);
      ctx.lineTo(px, py + 7);
      ctx.stroke();

      // Lock/unlock icon near the pivot crosshair
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = pivotLocked
        ? "rgba(255,200,50,0.9)"
        : "rgba(255,140,50,0.9)";
      ctx.fillText(pivotLocked ? "🔒" : "🔓", px + 9, py - 8);
    }
  }
}

// ─── Legacy TransformTool ────────────────────────────────────────────────────
//
// Kept intact so TransformOverlay.tsx and TransformToolPanel.tsx continue to
// compile without changes. Internally it delegates to VectorTransformTool for
// the rendering loop but still honours the TransformState-based API.

export class TransformTool {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: TransformToolOptions;
  private state: TransformState | null = null;

  private rafId = 0;
  private activeHandle: ActiveHandle = null;
  private activePointerId: number | null = null;
  private dragStartWorld: [number, number] = [0, 0];
  private dragStartLocal: [number, number] = [0, 0];
  private dragStartState: TransformState | null = null;
  private hoverHandle: ActiveHandle = null;

  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartAngle = 0;
  private pinchStartState: TransformState | null = null;

  private shiftHeld = false;
  private ctrlHeld = false;

  private snapGuides: SnapGuide[] = [];
  private handles: HandlePos[] = [];
  private rotateHandle: HandlePos = { id: "rotate", wx: 0, wy: 0 };

  private readonly boundPointerDown: (e: PointerEvent) => void;
  private readonly boundPointerMove: (e: PointerEvent) => void;
  private readonly boundPointerUp: (e: PointerEvent) => void;
  private readonly boundDblClick: (e: MouseEvent) => void;
  private readonly boundKeyDown: (e: KeyboardEvent) => void;
  private readonly boundKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, opts: TransformToolOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get 2D context from overlay canvas");
    this.ctx = ctx;
    this.opts = opts;

    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.boundDblClick = this.onDblClick.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);

    canvas.addEventListener("pointerdown", this.boundPointerDown);
    canvas.addEventListener("pointermove", this.boundPointerMove);
    canvas.addEventListener("pointerup", this.boundPointerUp);
    canvas.addEventListener("pointercancel", this.boundPointerUp);
    canvas.addEventListener("dblclick", this.boundDblClick);
    document.addEventListener("keydown", this.boundKeyDown);
    document.addEventListener("keyup", this.boundKeyUp);

    this.scheduleRender();
  }

  setState(state: TransformState | null): void {
    this.state = state;
  }
  setOptions(opts: Partial<TransformToolOptions>): void {
    this.opts = { ...this.opts, ...opts };
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener("pointerdown", this.boundPointerDown);
    this.canvas.removeEventListener("pointermove", this.boundPointerMove);
    this.canvas.removeEventListener("pointerup", this.boundPointerUp);
    this.canvas.removeEventListener("pointercancel", this.boundPointerUp);
    this.canvas.removeEventListener("dblclick", this.boundDblClick);
    document.removeEventListener("keydown", this.boundKeyDown);
    document.removeEventListener("keyup", this.boundKeyUp);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private scheduleRender(): void {
    this.rafId = requestAnimationFrame(() => {
      this.render();
      this.scheduleRender();
    });
  }

  private clientToCanvas(clientX: number, clientY: number): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const zf = this.opts.zoom / 100;
    return [(clientX - rect.left) / zf, (clientY - rect.top) / zf];
  }

  private computeHandles(s: TransformState): {
    handles: HandlePos[];
    rotateHandle: HandlePos;
  } {
    const { x, y, width: w, height: h, angle, pivotX, pivotY } = s;
    const localPoints: { id: ActiveHandle; lx: number; ly: number }[] = [
      { id: "nw", lx: x, ly: y },
      { id: "n", lx: x + w / 2, ly: y },
      { id: "ne", lx: x + w, ly: y },
      { id: "w", lx: x, ly: y + h / 2 },
      { id: "e", lx: x + w, ly: y + h / 2 },
      { id: "sw", lx: x, ly: y + h },
      { id: "s", lx: x + w / 2, ly: y + h },
      { id: "se", lx: x + w, ly: y + h },
    ];
    const handles: HandlePos[] = localPoints.map(({ id, lx, ly }) => {
      const [wx, wy] = localToWorld(lx, ly, pivotX, pivotY, angle);
      return { id, wx, wy };
    });
    const topCenterHandle = handles.find((hp) => hp.id === "n")!;
    const angleRad = (angle * Math.PI) / 180;
    const rotateHandle: HandlePos = {
      id: "rotate",
      wx: topCenterHandle.wx - Math.sin(angleRad) * ROTATE_OFFSET,
      wy: topCenterHandle.wy - Math.cos(angleRad) * ROTATE_OFFSET,
    };
    return { handles, rotateHandle };
  }

  private hitTest(wx: number, wy: number, isTouch: boolean): ActiveHandle {
    if (!this.state) return null;
    const hitR = isTouch ? TOUCH_HIT_RADIUS : MOUSE_HIT_RADIUS;
    if (Math.hypot(wx - this.rotateHandle.wx, wy - this.rotateHandle.wy) < hitR)
      return "rotate";
    const { pivotX, pivotY } = this.state;
    if (Math.hypot(wx - pivotX, wy - pivotY) < hitR) return "pivot";
    for (const hp of this.handles) {
      if (Math.hypot(wx - hp.wx, wy - hp.wy) < hitR) return hp.id;
    }
    const { x, y, width: bw, height: bh, angle } = this.state;
    const [lx, ly] = worldToLocal(wx, wy, pivotX, pivotY, angle);
    if (lx >= x && lx <= x + bw && ly >= y && ly <= y + bh) return "move";
    return null;
  }

  private getCursor(handle: ActiveHandle): string {
    if (!handle) return "default";
    if (handle === "rotate") return "grab";
    if (handle === "pivot") return "crosshair";
    if (handle === "move") return "move";
    const angle = this.state?.angle ?? 0;
    const step = ((Math.round(angle / 45) % 8) + 8) % 8;
    const order = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    const baseIdx: Record<string, number> = {
      nw: 0,
      n: 1,
      ne: 2,
      e: 3,
      se: 4,
      s: 5,
      sw: 6,
      w: 7,
    };
    if (handle in baseIdx) {
      const rotated = order[(baseIdx[handle] + step) % 8];
      return `${rotated}-resize`;
    }
    return "default";
  }

  private snapXY(
    x: number,
    y: number,
    w: number,
    h: number,
  ): { x: number; y: number; guides: SnapGuide[] } {
    if (!this.state?.snapEnabled) return { x, y, guides: [] };
    const { gridSize } = this.state;
    const { canvasWidth, canvasHeight, siblingBounds = [] } = this.opts;
    const guides: SnapGuide[] = [];
    let sx = x;
    let sy = y;
    const tryX = (v: number, t: number) => {
      if (Math.abs(v - t) < SNAP_THRESHOLD) {
        guides.push({ x: t });
        return t;
      }
      return v;
    };
    const tryY = (v: number, t: number) => {
      if (Math.abs(v - t) < SNAP_THRESHOLD) {
        guides.push({ y: t });
        return t;
      }
      return v;
    };
    sx = tryX(sx, snapToGrid(sx, gridSize));
    sy = tryY(sy, snapToGrid(sy, gridSize));
    sx = tryX(sx, 0);
    sx = tryX(sx + w, canvasWidth) - w;
    sx = tryX(sx + w / 2, canvasWidth / 2) - w / 2;
    sy = tryY(sy, 0);
    sy = tryY(sy + h, canvasHeight) - h;
    sy = tryY(sy + h / 2, canvasHeight / 2) - h / 2;
    for (const sb of siblingBounds) {
      sx = tryX(sx, sb.x);
      sx = tryX(sx, sb.x + sb.width);
      sx = tryX(sx + w, sb.x) - w;
      sx = tryX(sx + w, sb.x + sb.width) - w;
      sx = tryX(sx + w / 2, sb.x + sb.width / 2) - w / 2;
      sy = tryY(sy, sb.y);
      sy = tryY(sy, sb.y + sb.height);
      sy = tryY(sy + h, sb.y) - h;
      sy = tryY(sy + h, sb.y + sb.height) - h;
      sy = tryY(sy + h / 2, sb.y + sb.height / 2) - h / 2;
    }
    return { x: sx, y: sy, guides };
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.state) return;
    const [wx, wy] = this.clientToCanvas(e.clientX, e.clientY);
    const isTouch = e.pointerType === "touch";
    this.pointers.set(e.pointerId, { x: wx, y: wy });
    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      this.pinchStartDist = Math.hypot(
        pts[1].x - pts[0].x,
        pts[1].y - pts[0].y,
      );
      this.pinchStartAngle =
        Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * (180 / Math.PI);
      this.pinchStartState = { ...this.state };
      this.activeHandle = null;
      return;
    }
    const hit = this.hitTest(wx, wy, isTouch);
    if (!hit) return;
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.activePointerId = e.pointerId;
    this.activeHandle = hit;
    this.dragStartWorld = [wx, wy];
    this.dragStartState = { ...this.state };
    const { pivotX, pivotY, angle } = this.state;
    this.dragStartLocal = worldToLocal(wx, wy, pivotX, pivotY, angle);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.state) return;
    const [wx, wy] = this.clientToCanvas(e.clientX, e.clientY);
    const isTouch = e.pointerType === "touch";
    if (this.pointers.has(e.pointerId))
      this.pointers.set(e.pointerId, { x: wx, y: wy });
    if (this.pointers.size >= 2 && this.pinchStartState) {
      this.handlePinch();
      return;
    }
    if (this.activeHandle === null || this.activePointerId !== e.pointerId) {
      const hit = this.hitTest(wx, wy, isTouch);
      if (hit !== this.hoverHandle) {
        this.hoverHandle = hit;
        this.canvas.style.cursor = this.getCursor(hit);
      }
      return;
    }
    e.preventDefault();
    const ts = this.dragStartState!;
    const { pivotX, pivotY, angle } = ts;
    const [lx, ly] = worldToLocal(wx, wy, pivotX, pivotY, angle);
    const dLocal: [number, number] = [
      lx - this.dragStartLocal[0],
      ly - this.dragStartLocal[1],
    ];
    switch (this.activeHandle) {
      case "move":
        this.handleMove(wx, wy, ts);
        break;
      case "rotate":
        this.handleRotate(wx, wy, ts);
        break;
      case "pivot":
        this.handlePivotMove(wx, wy);
        break;
      default:
        this.handleResize(this.activeHandle, dLocal, ts);
        break;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    this.pinchStartState = null;
    if (this.activePointerId !== e.pointerId) return;
    if (this.canvas.hasPointerCapture(e.pointerId))
      this.canvas.releasePointerCapture(e.pointerId);
    this.activeHandle = null;
    this.activePointerId = null;
    this.snapGuides = [];
    this.canvas.style.cursor = "default";
  }

  private onDblClick(e: MouseEvent): void {
    if (!this.state) return;
    const [wx, wy] = this.clientToCanvas(e.clientX, e.clientY);
    const rh = this.rotateHandle;
    if (Math.hypot(wx - rh.wx, wy - rh.wy) < MOUSE_HIT_RADIUS * 1.5)
      this.applyState({ ...this.state, angle: 0 });
  }

  private handleMove(wx: number, wy: number, ts: TransformState): void {
    const [swx, swy] = this.dragStartWorld;
    const dx = wx - swx;
    const dy = wy - swy;
    const rawX = ts.x + dx;
    const rawY = ts.y + dy;
    const {
      x: sx,
      y: sy,
      guides,
    } = this.snapXY(rawX, rawY, ts.width, ts.height);
    this.snapGuides = guides;
    const pdx = sx - ts.x;
    const pdy = sy - ts.y;
    this.applyState({
      ...this.state!,
      x: sx,
      y: sy,
      pivotX: ts.pivotX + pdx,
      pivotY: ts.pivotY + pdy,
    });
  }

  private handleRotate(wx: number, wy: number, ts: TransformState): void {
    const { pivotX, pivotY } = ts;
    const rawAngle =
      Math.atan2(wy - pivotY, wx - pivotX) * (180 / Math.PI) + 90;
    const snapped = snapAngle(rawAngle, this.shiftHeld);
    this.applyState({ ...this.state!, angle: snapped });
  }

  private handlePivotMove(wx: number, wy: number): void {
    this.applyState({ ...this.state!, pivotX: wx, pivotY: wy });
  }

  private handleResize(
    handle: string,
    dLocal: [number, number],
    ts: TransformState,
  ): void {
    const [dlx, dly] = dLocal;
    const { x, y, width: w, height: h, pivotX, pivotY, angle } = ts;
    const lockAspect =
      ts.aspectLocked || ts.maintainAspectRatio || this.shiftHeld;
    const ar = h > 0 ? w / h : 1;
    if (this.ctrlHeld) {
      if (handle === "n" || handle === "s") {
        this.applyState({
          ...this.state!,
          skewX: ts.skewX + (dlx / Math.max(w, 1)) * 90,
        });
        return;
      }
      if (handle === "e" || handle === "w") {
        this.applyState({
          ...this.state!,
          skewY: ts.skewY + (dly / Math.max(h, 1)) * 90,
        });
        return;
      }
    }
    let newX = x;
    let newY = y;
    let newW = w;
    let newH = h;
    switch (handle) {
      case "se":
        newW = Math.max(MIN_SIZE, w + dlx);
        newH = lockAspect ? newW / ar : Math.max(MIN_SIZE, h + dly);
        break;
      case "sw":
        newW = Math.max(MIN_SIZE, w - dlx);
        newH = lockAspect ? newW / ar : Math.max(MIN_SIZE, h + dly);
        newX = x + (w - newW);
        break;
      case "ne":
        newW = Math.max(MIN_SIZE, w + dlx);
        newH = lockAspect ? newW / ar : Math.max(MIN_SIZE, h - dly);
        newY = y + (h - newH);
        break;
      case "nw":
        newW = Math.max(MIN_SIZE, w - dlx);
        newH = lockAspect ? newW / ar : Math.max(MIN_SIZE, h - dly);
        newX = x + (w - newW);
        newY = y + (h - newH);
        break;
      case "e":
        newW = Math.max(MIN_SIZE, w + dlx);
        break;
      case "w":
        newW = Math.max(MIN_SIZE, w - dlx);
        newX = x + (w - newW);
        break;
      case "s":
        newH = Math.max(MIN_SIZE, h + dly);
        break;
      case "n":
        newH = Math.max(MIN_SIZE, h - dly);
        newY = y + (h - newH);
        break;
    }
    const [oldCWx, oldCWy] = localToWorld(
      x + w / 2,
      y + h / 2,
      pivotX,
      pivotY,
      angle,
    );
    const [tentWx, tentWy] = localToWorld(
      newX + newW / 2,
      newY + newH / 2,
      pivotX,
      pivotY,
      angle,
    );
    this.applyState({
      ...this.state!,
      x: newX,
      y: newY,
      width: newW,
      height: newH,
      pivotX: pivotX + (oldCWx - tentWx),
      pivotY: pivotY + (oldCWy - tentWy),
    });
  }

  private handlePinch(): void {
    if (!this.pinchStartState) return;
    const pts = Array.from(this.pointers.values());
    if (pts.length < 2) return;
    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const currAngle =
      Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * (180 / Math.PI);
    const scaleDelta = this.pinchStartDist > 0 ? dist / this.pinchStartDist : 1;
    const angleDelta = currAngle - this.pinchStartAngle;
    const ts = this.pinchStartState;
    this.applyState({
      ...this.state!,
      width: Math.max(MIN_SIZE, ts.width * scaleDelta),
      height: Math.max(MIN_SIZE, ts.height * scaleDelta),
      angle: (((ts.angle + angleDelta) % 360) + 360) % 360,
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Shift") this.shiftHeld = true;
    if (e.key === "Control" || e.key === "Meta") this.ctrlHeld = true;
    if (!this.state) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "Enter") {
      e.preventDefault();
      this.opts.onConfirm(this.state);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      this.opts.onCancel();
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      dx = -step;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      dx = step;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      dy = -step;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      dy = step;
    }
    if (dx !== 0 || dy !== 0) {
      const s = this.state;
      this.applyState({
        ...s,
        x: s.x + dx,
        y: s.y + dy,
        pivotX: s.pivotX + dx,
        pivotY: s.pivotY + dy,
      });
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === "Shift") this.shiftHeld = false;
    if (e.key === "Control" || e.key === "Meta") this.ctrlHeld = false;
  }

  private applyState(newState: TransformState): void {
    this.state = newState;
    this.opts.onTransform(newState);
  }

  private render(): void {
    const { canvas, ctx } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.state) return;

    const s = this.state;
    const {
      x,
      y,
      width: w,
      height: h,
      angle,
      pivotX,
      pivotY,
      skewX,
      skewY,
    } = s;
    const angleRad = (angle * Math.PI) / 180;

    const { handles, rotateHandle } = this.computeHandles(s);
    this.handles = handles;
    this.rotateHandle = rotateHandle;

    // Snap guides
    ctx.save();
    ctx.strokeStyle = "rgba(59,130,246,0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    for (const g of this.snapGuides) {
      if (g.x !== undefined) {
        ctx.beginPath();
        ctx.moveTo(g.x, 0);
        ctx.lineTo(g.x, canvas.height);
        ctx.stroke();
      }
      if (g.y !== undefined) {
        ctx.beginPath();
        ctx.moveTo(0, g.y);
        ctx.lineTo(canvas.width, g.y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Bounding box
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angleRad);
    if (skewX !== 0)
      ctx.transform(1, 0, Math.tan((skewX * Math.PI) / 180), 1, 0, 0);
    if (skewY !== 0)
      ctx.transform(1, Math.tan((skewY * Math.PI) / 180), 0, 1, 0, 0);
    const rx = x - pivotX;
    const ry = y - pivotY;
    ctx.fillStyle = "rgba(59,130,246,0.06)";
    ctx.fillRect(rx, ry, w, h);
    ctx.strokeStyle = "rgba(59,130,246,0.9)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(rx, ry, w, h);
    ctx.setLineDash([]);
    if (Math.abs(angle) > 0.4) {
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "rgba(59,130,246,0.9)";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(angle)}°`, rx + w / 2, ry - 10);
    }
    ctx.restore();

    // Rotate connector
    const nHandle = handles.find((hp) => hp.id === "n")!;
    ctx.save();
    ctx.strokeStyle = "rgba(59,130,246,0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(nHandle.wx, nHandle.wy);
    ctx.lineTo(rotateHandle.wx, rotateHandle.wy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Scale handles
    for (const hp of handles) {
      const isHover = this.hoverHandle === hp.id;
      const isActive = this.activeHandle === hp.id;
      const r = isHover || isActive ? HANDLE_RADIUS_HOVER : HANDLE_RADIUS;
      ctx.beginPath();
      ctx.arc(hp.wx, hp.wy, r, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.strokeStyle = isActive ? "rgba(37,99,235,1)" : "rgba(59,130,246,0.9)";
      ctx.lineWidth = isHover || isActive ? 2 : 1.5;
      ctx.stroke();
    }

    // Rotation handle
    {
      const rh = rotateHandle;
      const isHover = this.hoverHandle === "rotate";
      const isActive = this.activeHandle === "rotate";
      const r = isHover || isActive ? 11 : 9;
      ctx.beginPath();
      ctx.arc(rh.wx, rh.wy, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "rgba(59,130,246,0.18)" : "white";
      ctx.fill();
      ctx.strokeStyle = "rgba(59,130,246,0.9)";
      ctx.lineWidth = isActive ? 2 : 1.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(59,130,246,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rh.wx - 5, rh.wy);
      ctx.lineTo(rh.wx + 5, rh.wy);
      ctx.moveTo(rh.wx, rh.wy - 5);
      ctx.lineTo(rh.wx, rh.wy + 5);
      ctx.stroke();
    }

    // Pivot crosshair
    {
      const px = pivotX;
      const py = pivotY;
      const isHover = this.hoverHandle === "pivot";
      const r = isHover ? 7 : 5;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,200,50,0.15)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,200,50,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,200,50,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 7, py);
      ctx.lineTo(px + 7, py);
      ctx.moveTo(px, py - 7);
      ctx.lineTo(px, py + 7);
      ctx.stroke();
    }
  }
}
