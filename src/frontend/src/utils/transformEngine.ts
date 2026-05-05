/**
 * transformEngine.ts
 *
 * Core transform math utilities for the Sketchora advanced transform tool.
 *
 * Design principles:
 *  - All math done in LOCAL (un-rotated) coordinate space to eliminate handle jitter.
 *  - LERP-based smooth animation via LerpState.
 *  - Pivot-relative rotation and scaling.
 *  - Partial stroke point selection — only selectedPoints are mutated.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformMatrix {
  /** Rotation in degrees */
  angle: number;
  /** Scale factors (1 = no change) */
  scaleX: number;
  scaleY: number;
  /** Shear/skew in degrees */
  skewX: number;
  skewY: number;
  /** Translation (top-left of bounding box in canvas space) */
  translateX: number;
  translateY: number;
  /** Flip flags */
  flipH: boolean;
  flipV: boolean;
  /** Pivot in canvas space (all rotations/scales happen around this point) */
  pivotX: number;
  pivotY: number;
}

/** Live-interpolated state used by the LERP animation engine. */
export interface LerpState {
  current: TransformMatrix;
  target: TransformMatrix;
  /** 0..1 — animation factor per frame (0.1 = smooth, 1 = instant) */
  factor: number;
  /** Whether the animation loop is running */
  animating: boolean;
}

export interface SelectionBox extends Bounds {
  /** Screen-space (CSS pixels) selection drawn by user */
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MIN_TRANSFORM_SIZE = 4;
export const LERP_FACTOR = 0.12;
export const LERP_STOP_EPSILON = 0.25; // stop lerp when diff < this px
export const ANGLE_SNAP_STEP = 45;
export const ANGLE_SNAP_THRESHOLD = 6;

// ─── Rotation math ────────────────────────────────────────────────────────────

/** Rotate a point around an arbitrary pivot. Returns the new [x, y]. */
export function rotateAroundPivot(
  px: number,
  py: number,
  pivotX: number,
  pivotY: number,
  angleDeg: number,
): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - pivotX;
  const dy = py - pivotY;
  return [pivotX + dx * cos - dy * sin, pivotY + dx * sin + dy * cos];
}

/** Convert world-space coords to local (un-rotated) space relative to pivot. */
export function worldToLocal(
  wx: number,
  wy: number,
  pivotX: number,
  pivotY: number,
  angleDeg: number,
): [number, number] {
  return rotateAroundPivot(wx, wy, pivotX, pivotY, -angleDeg);
}

/** Convert local (un-rotated) coords back to world space relative to pivot. */
export function localToWorld(
  lx: number,
  ly: number,
  pivotX: number,
  pivotY: number,
  angleDeg: number,
): [number, number] {
  return rotateAroundPivot(lx, ly, pivotX, pivotY, angleDeg);
}

// ─── Scale math ───────────────────────────────────────────────────────────────

/** Scale a point relative to a pivot, with optional flip. */
export function scaleAroundPivot(
  px: number,
  py: number,
  pivotX: number,
  pivotY: number,
  sx: number,
  sy: number,
): [number, number] {
  return [pivotX + (px - pivotX) * sx, pivotY + (py - pivotY) * sy];
}

// ─── Full transform pipeline ──────────────────────────────────────────────────

/**
 * Apply the full transform chain to a single point:
 *   translate(origCenter → origin)
 *   → scale
 *   → skew
 *   → flip
 *   → rotate
 *   → translate(origin → newCenter / pivot)
 *
 * @param px, py        Point to transform
 * @param origCx, origCy  Center of the ORIGINAL bounding box (pre-transform)
 * @param matrix        Transform to apply
 */
export function applyTransformToPoint(
  px: number,
  py: number,
  origCx: number,
  origCy: number,
  matrix: TransformMatrix,
): [number, number] {
  const { angle, scaleX, scaleY, skewX, skewY, flipH, flipV, pivotX, pivotY } =
    matrix;

  // 1. Translate to origin relative to original bbox center
  let lx = px - origCx;
  let ly = py - origCy;

  // 2. Scale
  lx *= scaleX;
  ly *= scaleY;

  // 3. Skew
  const skewXRad = (skewX * Math.PI) / 180;
  const skewYRad = (skewY * Math.PI) / 180;
  const slx = lx + ly * Math.tan(skewXRad);
  const sly = ly + lx * Math.tan(skewYRad);
  lx = slx;
  ly = sly;

  // 4. Flip
  if (flipH) lx = -lx;
  if (flipV) ly = -ly;

  // 5. Rotate around local origin
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = lx * cos - ly * sin;
  const ry = lx * sin + ly * cos;

  // 6. Translate to pivot (new center)
  return [rx + pivotX, ry + pivotY];
}

// ─── Bounding box computation ─────────────────────────────────────────────────

/** Compute the tight axis-aligned bounding box of a set of points. */
export function pointsBounds(points: Point[]): Bounds | null {
  if (points.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(MIN_TRANSFORM_SIZE, maxX - minX),
    height: Math.max(MIN_TRANSFORM_SIZE, maxY - minY),
  };
}

/** Returns true if point (px, py) is inside the given axis-aligned box. */
export function pointInBox(px: number, py: number, box: Bounds): boolean {
  return (
    px >= box.x &&
    px <= box.x + box.width &&
    py >= box.y &&
    py <= box.y + box.height
  );
}

// ─── Partial selection helpers ────────────────────────────────────────────────

/**
 * Given a canvas-space selection box and a list of points, return the indices
 * of all points that fall INSIDE the box.
 *
 * Used for partial brush-stroke selection: only the returned indices
 * should be transformed — the others stay fixed.
 */
export function getPointIndicesInBox(
  points: Point[],
  box: SelectionBox,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (pointInBox(p.x, p.y, box)) result.push(i);
  }
  return result;
}

/**
 * Compute the bounding box of ONLY the selected points within a stroke.
 * Returns null if no selected points exist.
 */
export function selectedPointsBounds(
  points: Point[],
  selectedIndices: number[],
): Bounds | null {
  if (selectedIndices.length === 0) return null;
  const selected = selectedIndices.map((i) => points[i]).filter(Boolean);
  return pointsBounds(selected);
}

// ─── LERP animation engine ───────────────────────────────────────────────────

/** Create an initial LERP state with current === target. */
export function createLerpState(initial: TransformMatrix): LerpState {
  return {
    current: { ...initial },
    target: { ...initial },
    factor: LERP_FACTOR,
    animating: false,
  };
}

/**
 * Set a new target for the LERP animation.
 * Call this whenever transform state should change (e.g., drag, panel input).
 */
export function setLerpTarget(
  lerpState: LerpState,
  target: TransformMatrix,
): LerpState {
  return {
    ...lerpState,
    target: { ...target },
    animating: true,
  };
}

/** Linear interpolation of a scalar value. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear interpolation of an angle (handles 0/360 wraparound). */
function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  // Wrap to [-180, 180]
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

/**
 * Advance the LERP animation by one frame.
 * Call this inside requestAnimationFrame.
 *
 * Returns the updated LerpState. Sets `animating = false` when converged.
 */
export function advanceLerp(lerpState: LerpState): LerpState {
  if (!lerpState.animating) return lerpState;

  const { current, target, factor } = lerpState;
  const next: TransformMatrix = {
    angle: lerpAngle(current.angle, target.angle, factor),
    scaleX: lerp(current.scaleX, target.scaleX, factor),
    scaleY: lerp(current.scaleY, target.scaleY, factor),
    skewX: lerp(current.skewX, target.skewX, factor),
    skewY: lerp(current.skewY, target.skewY, factor),
    translateX: lerp(current.translateX, target.translateX, factor),
    translateY: lerp(current.translateY, target.translateY, factor),
    flipH: target.flipH, // booleans snap immediately
    flipV: target.flipV,
    pivotX: lerp(current.pivotX, target.pivotX, factor),
    pivotY: lerp(current.pivotY, target.pivotY, factor),
  };

  // Check convergence
  const converged =
    Math.abs(next.translateX - target.translateX) < LERP_STOP_EPSILON &&
    Math.abs(next.translateY - target.translateY) < LERP_STOP_EPSILON &&
    Math.abs(next.angle - target.angle) < 0.05 &&
    Math.abs(next.scaleX - target.scaleX) < 0.001 &&
    Math.abs(next.scaleY - target.scaleY) < 0.001;

  return {
    ...lerpState,
    current: converged ? { ...target } : next,
    animating: !converged,
  };
}

// ─── Snap helpers ─────────────────────────────────────────────────────────────

/** Snap a value to the nearest grid multiple. */
export function snapToGrid(v: number, gridSize: number): number {
  return Math.round(v / gridSize) * gridSize;
}

/**
 * Snap an angle to the nearest 45° increment when Shift is held,
 * or to a small threshold range when free-rotating.
 */
export function snapAngleDeg(angleDeg: number, shiftHeld: boolean): number {
  const normalized = ((angleDeg % 360) + 360) % 360;
  if (shiftHeld)
    return Math.round(normalized / ANGLE_SNAP_STEP) * ANGLE_SNAP_STEP;
  // Soft snap: auto-snap when close to a 45° multiple
  for (let target = 0; target <= 360; target += ANGLE_SNAP_STEP) {
    if (Math.abs(normalized - target) <= ANGLE_SNAP_THRESHOLD) return target;
  }
  return normalized;
}

// ─── Identity matrix factory ─────────────────────────────────────────────────

export function identityMatrix(
  pivotX = 0,
  pivotY = 0,
  translateX = 0,
  translateY = 0,
): TransformMatrix {
  return {
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    translateX,
    translateY,
    flipH: false,
    flipV: false,
    pivotX,
    pivotY,
  };
}

// ─── Export a named bundle for convenience ────────────────────────────────────

export const TransformEngine = {
  rotateAroundPivot,
  worldToLocal,
  localToWorld,
  scaleAroundPivot,
  applyTransformToPoint,
  pointsBounds,
  pointInBox,
  getPointIndicesInBox,
  selectedPointsBounds,
  createLerpState,
  setLerpTarget,
  advanceLerp,
  snapToGrid,
  snapAngleDeg,
  identityMatrix,
} as const;
