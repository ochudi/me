"use client";

import { useEffect, useRef, useState } from "react";
import {
  forceManyBody,
  forceSimulation,
  type Force,
  type SimulationNodeDatum,
} from "d3-force";
import { randomNormal } from "d3-random";
import { dbscan, stabilizeLabels } from "@/lib/clustering/dbscan";
import {
  kmeansPlusPlus,
  kmeansStep,
  resizeCentroids,
  updateCentroids,
} from "@/lib/clustering/kmeans";
import ClusterControls from "./ClusterControls";
import ClusterInfo from "./ClusterInfo";

export type ClusterAlgorithm = "kmeans" | "dbscan";
export type ClusterTheme = "light" | "dark";

export interface ClusterCanvasProps {
  algorithm?: ClusterAlgorithm;
  pointCount?: number;
  theme?: ClusterTheme;
}

type ClusterNode = SimulationNodeDatum & { x: number; y: number };

type Pointer = { x: number; y: number } | null;

type LiveParams = {
  algorithm: ClusterAlgorithm;
  k: number;
  epsilon: number;
  minPts: number;
  theme: ClusterTheme;
};

const RAMP_STEPS = 5;
const POINTER_RADIUS = 80;
const COLOR_LERP = 0.08;
const POINT_RADIUS = 1.5; // 3px points
const CENTROID_RADIUS = 2.5; // 5px centroids
const TAU = Math.PI * 2;
const MOBILE_POINTS = 150;
const SETTLE_TICKS = 300;
const DBSCAN_EVERY = 10;
const DEFAULT_EPSILON = 0.08;
// The field morphs between gaussian blobs and a recognisable shape on a
// slow cycle. Morphing only swaps the anchor targets; the springs do the
// travel, so it adds no per-frame cost.
const BLOB_HOLD_TICKS = 12 * 60;
const SHAPE_HOLD_TICKS = 7 * 60;
// Tick the simulation at most ~60 times a second so 120Hz displays do not
// run the physics at double speed (or double the work).
const MIN_FRAME_MS = 1000 / 65;

// Motion model. Every point is tethered to a home position inside its blob;
// the spring is what preserves the cluster structure that the clustering
// algorithms are there to find. Repulsion is short-range only (spacing
// inside a blob, never enough to melt the composition) and a faint per-point
// wander keeps the field alive between interactions.
const SPRING_STRENGTH = 0.06;
const WANDER_STRENGTH = 0.35;
const CHARGE_STRENGTH = -2;
const CHARGE_RANGE = 48;
const POINTER_STRENGTH = 12;

function clampK(k: number, n: number): number {
  return Math.max(1, Math.min(Math.round(k), Math.max(1, n)));
}

/** Five-step grey ramp: dark-to-mid on light theme, light-to-mid on dark. */
function buildRamp(theme: ClusterTheme): number[] {
  const [from, to] = theme === "dark" ? [250, 85] : [10, 107];
  const ramp: number[] = [];
  for (let i = 0; i < RAMP_STEPS; i++) {
    ramp.push(Math.round(from + (to - from) * (i / (RAMP_STEPS - 1))));
  }
  return ramp;
}

const RAMPS: Record<ClusterTheme, number[]> = {
  light: buildRamp("light"),
  dark: buildRamp("dark"),
};

const CENTROID_RING: Record<ClusterTheme, string> = {
  light: "rgba(10,10,10,0.55)",
  dark: "rgba(250,250,250,0.55)",
};

// Precomputed fill styles for every grey so draw() never builds strings.
const GREY_FILLS = Array.from(
  { length: 256 },
  (_, g) => `rgb(${g},${g},${g})`,
);

/**
 * Maps cluster index to a ramp step, spreading the active clusters across
 * the available steps so neighbouring clusters get the most separated greys
 * the ramp allows. Falls back to cycling when there are more clusters than
 * steps.
 */
function rampIndex(c: number, count: number, steps: number): number {
  if (count <= 1) return 0;
  if (count > steps) return c % steps;
  return Math.round((c * (steps - 1)) / (count - 1));
}

type Layout = {
  /** Home position per point, pixel space. */
  anchors: Float32Array;
  /** Per-point wander frequency (radians per second) and phase. */
  wanderFreq: Float32Array;
  wanderPhase: Float32Array;
  blobCount: number;
};

/**
 * Fills `anchors` with 3-5 gaussian blobs whose centres sit on a loose ring
 * around the middle of the canvas. Even angular spacing keeps the blobs
 * separated (so there is actually structure to cluster) and leaves the
 * centre sparse for whatever sits on top of the canvas.
 */
function fillBlobAnchors(
  anchors: Float32Array,
  n: number,
  w: number,
  h: number,
  blobCount: number,
): void {
  const minDim = Math.min(w, h);
  const cx0 = w / 2;
  const cy0 = h / 2;

  const centers: Array<[number, number]> = [];
  const spreads: number[] = [];
  const weights: number[] = [];
  const baseAngle = Math.random() * TAU;
  for (let b = 0; b < blobCount; b++) {
    const angle =
      baseAngle + (b / blobCount) * TAU + (Math.random() - 0.5) * 0.5;
    const radius = minDim * (0.24 + Math.random() * 0.14);
    centers.push([
      cx0 + Math.cos(angle) * radius * (w >= h ? 1.25 : 1),
      cy0 + Math.sin(angle) * radius * 0.85,
    ]);
    spreads.push(minDim * (0.045 + Math.random() * 0.035));
    weights.push(0.7 + Math.random() * 0.6);
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pad = 24;

  let i = 0;
  for (let b = 0; b < blobCount; b++) {
    const count =
      b === blobCount - 1
        ? n - i
        : Math.round((weights[b] / totalWeight) * n);
    const gx = randomNormal(centers[b][0], spreads[b]);
    const gy = randomNormal(centers[b][1], spreads[b]);
    for (let c = 0; c < count && i < n; c++, i++) {
      anchors[i * 2] = Math.max(pad, Math.min(w - pad, gx()));
      anchors[i * 2 + 1] = Math.max(pad, Math.min(h - pad, gy()));
    }
  }
}

// Shape targets for the morph cycle. Each fills the anchor buffer with a
// figure sized against the smaller canvas edge, with a little jitter so the
// result stays hand-drawn rather than mechanical.

/** Sunflower-head spiral: points at the golden angle, radius by sqrt(i). */
function fillPhyllotaxis(
  anchors: Float32Array,
  n: number,
  w: number,
  h: number,
): void {
  const minDim = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const rot = Math.random() * TAU;
  const scale = minDim * 0.4;
  for (let i = 0; i < n; i++) {
    const r = scale * Math.sqrt((i + 0.5) / n);
    const a = i * golden + rot;
    anchors[i * 2] = cx + Math.cos(a) * r * 1.1 + (Math.random() - 0.5) * 3;
    anchors[i * 2 + 1] = cy + Math.sin(a) * r * 0.9 + (Math.random() - 0.5) * 3;
  }
}

/** Three concentric rings, points split by circumference. */
function fillRings(
  anchors: Float32Array,
  n: number,
  w: number,
  h: number,
): void {
  const minDim = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const rot = Math.random() * TAU;
  const radii = [0.16, 0.28, 0.4].map((f) => f * minDim);
  const total = radii.reduce((a, r) => a + r, 0);
  let i = 0;
  for (let ring = 0; ring < radii.length; ring++) {
    const count =
      ring === radii.length - 1
        ? n - i
        : Math.round((radii[ring] / total) * n);
    for (let c = 0; c < count && i < n; c++, i++) {
      const a = rot + (c / count) * TAU;
      const r = radii[ring] + (Math.random() - 0.5) * 6;
      anchors[i * 2] = cx + Math.cos(a) * r * 1.1;
      anchors[i * 2 + 1] = cy + Math.sin(a) * r * 0.92;
    }
  }
}

/** Lissajous 3:2 curve, the classic figure-of-eight weave. */
function fillLissajous(
  anchors: Float32Array,
  n: number,
  w: number,
  h: number,
): void {
  const minDim = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const ampX = minDim * (w >= h ? 0.46 : 0.4);
  const ampY = minDim * 0.3;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    anchors[i * 2] =
      cx + Math.sin(3 * t + Math.PI / 2) * ampX + (Math.random() - 0.5) * 4;
    anchors[i * 2 + 1] = cy + Math.sin(2 * t) * ampY + (Math.random() - 0.5) * 4;
  }
}

const SHAPE_FILLERS = [fillPhyllotaxis, fillRings, fillLissajous];

function generateLayout(n: number, w: number, h: number): Layout {
  const blobCount = 3 + Math.floor(Math.random() * 3);
  const anchors = new Float32Array(n * 2);
  fillBlobAnchors(anchors, n, w, h, blobCount);

  const wanderFreq = new Float32Array(n);
  const wanderPhase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    wanderFreq[i] = 0.4 + Math.random() * 0.5;
    wanderPhase[i] = Math.random() * TAU;
  }

  return { anchors, wanderFreq, wanderPhase, blobCount };
}

/** Spring every point back toward its blob home. */
function createAnchorForce(
  anchors: Float32Array,
): Force<ClusterNode, undefined> {
  let nodes: ClusterNode[] = [];
  const force = ((alpha: number) => {
    const s = SPRING_STRENGTH * alpha;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.vx = (node.vx ?? 0) + (anchors[i * 2] - node.x) * s;
      node.vy = (node.vy ?? 0) + (anchors[i * 2 + 1] - node.y) * s;
    }
  }) as Force<ClusterNode, undefined>;
  force.initialize = (ns) => {
    nodes = ns;
  };
  return force;
}

/** Faint per-point drift so the field never reads as frozen. */
function createWanderForce(
  layout: Layout,
  time: { current: number },
): Force<ClusterNode, undefined> {
  let nodes: ClusterNode[] = [];
  const force = ((alpha: number) => {
    const a = WANDER_STRENGTH * alpha;
    const t = time.current;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const w = layout.wanderFreq[i];
      const p = layout.wanderPhase[i];
      node.vx = (node.vx ?? 0) + Math.cos(t * w + p) * a;
      node.vy = (node.vy ?? 0) + Math.sin(t * w * 1.3 + p * 1.7) * a;
    }
  }) as Force<ClusterNode, undefined>;
  force.initialize = (ns) => {
    nodes = ns;
  };
  return force;
}

/** Custom d3-force: push points away from the pointer within a fixed radius. */
function createPointerForce(
  pointerRef: { current: Pointer },
  radius: number,
): Force<ClusterNode, undefined> {
  let nodes: ClusterNode[] = [];
  const r2 = radius * radius;
  const force = ((alpha: number) => {
    const p = pointerRef.current;
    if (!p) return;
    for (const node of nodes) {
      const dx = node.x - p.x;
      const dy = node.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < r2) {
        const d = Math.sqrt(d2);
        const strength = (1 - d / radius) * alpha * POINTER_STRENGTH;
        node.vx = (node.vx ?? 0) + (dx / d) * strength;
        node.vy = (node.vy ?? 0) + (dy / d) * strength;
      }
    }
  }) as Force<ClusterNode, undefined>;
  force.initialize = (ns) => {
    nodes = ns;
  };
  return force;
}

export default function ClusterCanvas({
  algorithm: algorithmProp = "kmeans",
  pointCount = 300,
  theme: themeProp = "light",
}: ClusterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<Pointer>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [reduced, setReduced] = useState(false);

  const [algorithm, setAlgorithm] = useState<ClusterAlgorithm>(algorithmProp);
  const [k, setK] = useState(4);
  const [epsilon, setEpsilon] = useState(DEFAULT_EPSILON);
  const [minPts, setMinPts] = useState(4);

  // Live params read by the animation loop without re-running the setup.
  const paramsRef = useRef<LiveParams>({
    algorithm: algorithmProp,
    k: 4,
    epsilon: DEFAULT_EPSILON,
    minPts: 4,
    theme: themeProp,
  });
  // Static-mode redraw, set by the setup effect when there is no loop.
  const renderStaticRef = useRef<((recluster: boolean) => void) | null>(null);

  const theme = themeProp;
  const isStatic = isMobile || reduced;

  // Track viewport-driven modes.
  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 639px)");
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setIsMobile(mqMobile.matches);
      setReduced(mqReduced.matches);
    };
    update();
    mqMobile.addEventListener("change", update);
    mqReduced.addEventListener("change", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqReduced.removeEventListener("change", update);
    };
  }, []);

  // Keep live params in sync for the animation loop.
  useEffect(() => {
    paramsRef.current = { algorithm, k, epsilon, minPts, theme };
  }, [algorithm, k, epsilon, minPts, theme]);

  // Static redraw on theme/algorithm change (no reclustering needed).
  useEffect(() => {
    if (isStatic) renderStaticRef.current?.(false);
  }, [theme, algorithm, isStatic]);

  // Static recluster on parameter change.
  useEffect(() => {
    if (isStatic) renderStaticRef.current?.(true);
  }, [k, epsilon, minPts, isStatic]);

  // Main setup: build points, simulation, observers, and the render path.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const n = isMobile ? MOBILE_POINTS : pointCount;
    let cssW = container.clientWidth || 1;
    let cssH = container.clientHeight || 1;

    const layout = generateLayout(n, cssW, cssH);
    const { anchors } = layout;
    // Open with one k-means cluster per blob so the first frame shows the
    // structure being found, not imposed. The slider still goes anywhere.
    paramsRef.current.k = layout.blobCount;
    setK(layout.blobCount);
    const nodes: ClusterNode[] = new Array(n);
    for (let i = 0; i < n; i++) {
      // Start near home with a little scatter so the field settles in softly.
      nodes[i] = {
        x: anchors[i * 2] + (Math.random() - 0.5) * 48,
        y: anchors[i * 2 + 1] + (Math.random() - 0.5) * 48,
      };
    }

    const pts = new Float32Array(n * 2); // pixel space, for k-means and drawing
    const normPts = new Float32Array(n * 2); // minDim-relative, for DBSCAN
    const finalNorm = new Float32Array(n * 2); // settled positions for static mode
    const curGrey = new Float32Array(n).fill(theme === "dark" ? 170 : 90);
    const assignments = new Int32Array(n).fill(-1);
    const labels = new Int32Array(n).fill(-1); // displayed DBSCAN labels
    const scratchLabels = new Int32Array(n).fill(-1); // next run, before id matching
    let k0 = clampK(paramsRef.current.k, n);
    let centroids = kmeansPlusPlus(fillPixels(), k0);

    // DBSCAN re-runs immediately when its inputs change, otherwise on the
    // usual every-10th-frame cadence.
    let lastEps = -1;
    let lastMinPts = -1;
    let dbClusterCount = 1;
    let frameCount = 0;
    let rafId: number | null = null;
    let visible = true;
    let lastTick = 0;
    // Simulation clock for the wander force, advanced 1/60s per tick.
    const simTime = { current: 0 };
    // Morph cycle state. Ticks only advance while the loop runs, so the
    // cycle freezes with the rest of the field when paused.
    let morphPhase: "blobs" | "shape" = "blobs";
    let phaseTicks = 0;
    let nextShape = Math.floor(Math.random() * SHAPE_FILLERS.length);

    function fillPixels(): Float32Array {
      for (let i = 0; i < n; i++) {
        pts[i * 2] = nodes[i].x;
        pts[i * 2 + 1] = nodes[i].y;
      }
      return pts;
    }

    // DBSCAN distances are measured relative to the smaller canvas edge so
    // epsilon means the same thing at any aspect ratio.
    function fillNorm(): Float32Array {
      const minDim = Math.min(cssW, cssH);
      for (let i = 0; i < n; i++) {
        normPts[i * 2] = nodes[i].x / minDim;
        normPts[i * 2 + 1] = nodes[i].y / minDim;
      }
      return normPts;
    }

    function runDbscan(epsilon: number, minPts: number) {
      dbscan(normPts, epsilon, minPts, { labels: scratchLabels });
      stabilizeLabels(labels, scratchLabels);
      labels.set(scratchLabels);
      // Stabilised ids can be sparse, so size the grey spread by the
      // highest id in use.
      let maxLabel = -1;
      for (let i = 0; i < n; i++) {
        if (labels[i] > maxLabel) maxLabel = labels[i];
      }
      dbClusterCount = Math.max(1, maxLabel + 1);
      lastEps = epsilon;
      lastMinPts = minPts;
    }

    const sim = forceSimulation<ClusterNode>(nodes)
      .alpha(0.4)
      .alphaDecay(0)
      .velocityDecay(0.62)
      .force(
        "charge",
        forceManyBody<ClusterNode>()
          .strength(CHARGE_STRENGTH)
          .distanceMax(CHARGE_RANGE),
      )
      .force("anchor", createAnchorForce(anchors))
      .force("wander", createWanderForce(layout, simTime))
      .force("pointer", createPointerForce(pointerRef, POINTER_RADIUS))
      .stop();

    function applySize() {
      const prevW = cssW;
      const prevH = cssH;
      cssW = container!.clientWidth || 1;
      cssH = container!.clientHeight || 1;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas!.width = Math.round(cssW * dpr);
      canvas!.height = Math.round(cssH * dpr);
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);

      // Keep the composition: scale positions and homes to the new box.
      if (prevW !== cssW || prevH !== cssH) {
        const sx = cssW / prevW;
        const sy = cssH / prevH;
        for (const node of nodes) {
          node.x *= sx;
          node.y *= sy;
        }
        for (let i = 0; i < n; i++) {
          anchors[i * 2] *= sx;
          anchors[i * 2 + 1] *= sy;
        }
        for (let c = 0; c < centroids.length / 2; c++) {
          centroids[c * 2] *= sx;
          centroids[c * 2 + 1] *= sy;
        }
      }
    }

    // The backing store must track devicePixelRatio, and ResizeObserver does
    // not fire when a window moves to a display with a different ratio. Watch
    // the ratio via a matchMedia query rebuilt after every change.
    let disposeDprWatch = () => {};
    function armDprWatch(onChange: () => void) {
      disposeDprWatch();
      const mql = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      );
      const handler = () => {
        onChange();
        armDprWatch(onChange);
      };
      mql.addEventListener("change", handler);
      disposeDprWatch = () => mql.removeEventListener("change", handler);
    }

    // k-means clusters spread across all five greys; DBSCAN clusters keep
    // the dimmest grey reserved for noise.
    function targetGrey(i: number): number {
      const { algorithm: algo, theme: th } = paramsRef.current;
      const ramp = RAMPS[th];
      if (algo === "kmeans") {
        const a = assignments[i];
        return ramp[rampIndex(a >= 0 ? a : 0, k0, RAMP_STEPS)];
      }
      const l = labels[i];
      if (l < 0) return ramp[RAMP_STEPS - 1];
      return ramp[rampIndex(l, dbClusterCount, RAMP_STEPS - 1)];
    }

    function stepColors() {
      for (let i = 0; i < n; i++) {
        curGrey[i] += (targetGrey(i) - curGrey[i]) * COLOR_LERP;
      }
    }

    function snapColors() {
      for (let i = 0; i < n; i++) {
        curGrey[i] = targetGrey(i);
      }
    }

    function draw() {
      const { algorithm: algo, theme: th } = paramsRef.current;
      ctx!.clearRect(0, 0, cssW, cssH);
      for (let i = 0; i < n; i++) {
        ctx!.fillStyle = GREY_FILLS[Math.round(curGrey[i])];
        ctx!.beginPath();
        ctx!.arc(nodes[i].x, nodes[i].y, POINT_RADIUS, 0, TAU);
        ctx!.fill();
      }
      if (algo === "kmeans") {
        const ramp = RAMPS[th];
        ctx!.lineWidth = 1;
        ctx!.strokeStyle = CENTROID_RING[th];
        for (let c = 0; c < k0; c++) {
          ctx!.beginPath();
          ctx!.arc(centroids[c * 2], centroids[c * 2 + 1], CENTROID_RADIUS, 0, TAU);
          ctx!.fillStyle = GREY_FILLS[ramp[rampIndex(c, k0, RAMP_STEPS)]];
          ctx!.fill();
          ctx!.stroke();
        }
      }
    }

    function frame() {
      simTime.current += 1 / 60;

      phaseTicks += 1;
      if (morphPhase === "blobs" && phaseTicks >= BLOB_HOLD_TICKS) {
        SHAPE_FILLERS[nextShape](anchors, n, cssW, cssH);
        nextShape = (nextShape + 1) % SHAPE_FILLERS.length;
        morphPhase = "shape";
        phaseTicks = 0;
      } else if (morphPhase === "shape" && phaseTicks >= SHAPE_HOLD_TICKS) {
        fillBlobAnchors(anchors, n, cssW, cssH, layout.blobCount);
        morphPhase = "blobs";
        phaseTicks = 0;
      }

      sim.tick();
      fillPixels();

      const params = paramsRef.current;
      const wantK = clampK(params.k, n);
      if (wantK !== k0) {
        // Grow or shrink around the surviving centroids so clusters that
        // outlive a k change keep their grey.
        centroids = resizeCentroids(pts, centroids, wantK);
        k0 = wantK;
      }
      kmeansStep(pts, centroids, assignments);

      if (params.algorithm === "dbscan") {
        const dirty = params.epsilon !== lastEps || params.minPts !== lastMinPts;
        if (dirty || frameCount % DBSCAN_EVERY === 0) {
          fillNorm();
          runDbscan(params.epsilon, params.minPts);
        }
      } else {
        // Force an immediate run on the next switch to DBSCAN.
        lastEps = -1;
      }

      stepColors();
      draw();
      frameCount += 1;
    }

    function tickLoop(now: number) {
      rafId = requestAnimationFrame(tickLoop);
      const elapsed = now - lastTick;
      if (elapsed < MIN_FRAME_MS) return;
      // Carry the remainder so refresh rates that do not divide evenly into
      // 60Hz (144Hz, 90Hz) still average ~60 ticks a second.
      lastTick = now - (elapsed % MIN_FRAME_MS);
      frame();
    }
    function start() {
      if (rafId === null && visible && !document.hidden) {
        lastTick = 0;
        rafId = requestAnimationFrame(tickLoop);
      }
    }
    function stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    applySize();

    // ---- Static path: settle once, draw a single frame, no loop. ----
    if (isStatic) {
      for (let t = 0; t < SETTLE_TICKS; t++) {
        simTime.current += 1 / 60;
        sim.tick();
      }
      for (let i = 0; i < n; i++) {
        finalNorm[i * 2] = nodes[i].x / cssW;
        finalNorm[i * 2 + 1] = nodes[i].y / cssH;
      }

      const renderStatic = (recluster: boolean) => {
        for (let i = 0; i < n; i++) {
          nodes[i].x = finalNorm[i * 2] * cssW;
          nodes[i].y = finalNorm[i * 2 + 1] * cssH;
          pts[i * 2] = nodes[i].x;
          pts[i * 2 + 1] = nodes[i].y;
        }
        if (recluster) {
          const wantK = clampK(paramsRef.current.k, n);
          if (wantK !== k0) {
            centroids = resizeCentroids(pts, centroids, wantK);
            k0 = wantK;
          }
          for (let it = 0; it < 60; it++) {
            if (!kmeansStep(pts, centroids, assignments)) break;
          }
          fillNorm();
          runDbscan(paramsRef.current.epsilon, paramsRef.current.minPts);
        } else {
          updateCentroids(pts, centroids, assignments);
        }
        snapColors();
        draw();
      };

      renderStaticRef.current = renderStatic;
      renderStatic(true);

      const ro = new ResizeObserver(() => {
        applySize();
        renderStatic(false);
      });
      ro.observe(container);
      armDprWatch(() => {
        applySize();
        renderStatic(false);
      });

      return () => {
        ro.disconnect();
        disposeDprWatch();
        renderStaticRef.current = null;
        sim.stop();
      };
    }

    // ---- Animated path: rAF loop with off-screen and hidden pausing. ----
    const ro = new ResizeObserver(() => applySize());
    ro.observe(container);
    armDprWatch(() => applySize());

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(container);

    function onVisibility() {
      if (document.hidden) stop();
      else if (visible) start();
    }
    document.addEventListener("visibilitychange", onVisibility);

    // Pointer repulsion is desktop only, so ignore touch and pen input.
    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const rect = canvas!.getBoundingClientRect();
      pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onPointerLeave() {
      pointerRef.current = null;
    }
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave);

    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      disposeDprWatch();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      pointerRef.current = null;
      sim.stop();
    };
    // theme is intentionally excluded: it is applied live via paramsRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointCount, isMobile, reduced]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={
          algorithm === "kmeans"
            ? "Animated scatter of points grouped into k clusters by k-means"
            : "Animated scatter of points grouped by DBSCAN density clustering"
        }
        className="block h-full w-full"
      />
      {!isMobile && (
        <>
          <ClusterControls
            algorithm={algorithm}
            k={k}
            epsilon={epsilon}
            minPts={minPts}
            theme={theme}
            onAlgorithm={setAlgorithm}
            onK={setK}
            onEpsilon={setEpsilon}
            onMinPts={setMinPts}
          />
          <ClusterInfo theme={theme} />
        </>
      )}
    </div>
  );
}
