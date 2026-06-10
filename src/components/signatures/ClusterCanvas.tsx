"use client";

import { useEffect, useRef, useState } from "react";
import {
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Force,
  type SimulationNodeDatum,
} from "d3-force";
import { randomNormal } from "d3-random";
import {
  dbscan,
} from "@/lib/clustering/dbscan";
import {
  kmeansPlusPlus,
  kmeansStep,
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

function clampK(k: number, n: number): number {
  return Math.max(1, Math.min(Math.round(k), Math.max(1, n)));
}

function clamp01(v: number): number {
  return v < 0.02 ? 0.02 : v > 0.98 ? 0.98 : v;
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

/** Points in 3-5 gaussian blobs, normalised to [0,1]. */
function generateBlobs(n: number): Float32Array {
  const blobCount = 3 + Math.floor(Math.random() * 3);
  const sd = 0.06;
  const gens: Array<[() => number, () => number]> = [];
  for (let b = 0; b < blobCount; b++) {
    const cx = 0.18 + Math.random() * 0.64;
    const cy = 0.18 + Math.random() * 0.64;
    gens.push([randomNormal(cx, sd), randomNormal(cy, sd)]);
  }
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const [gx, gy] = gens[i % blobCount];
    out[i * 2] = clamp01(gx());
    out[i * 2 + 1] = clamp01(gy());
  }
  return out;
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
        const strength = (1 - d / radius) * alpha * 9;
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
  const [epsilon, setEpsilon] = useState(0.12);
  const [minPts, setMinPts] = useState(4);

  // Live params read by the animation loop without re-running the setup.
  const paramsRef = useRef<LiveParams>({
    algorithm: algorithmProp,
    k: 4,
    epsilon: 0.12,
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

    // Blobs in [0,1]; scale to pixels for the simulation.
    const norm = generateBlobs(n);
    const nodes: ClusterNode[] = new Array(n);
    for (let i = 0; i < n; i++) {
      nodes[i] = { x: norm[i * 2] * cssW, y: norm[i * 2 + 1] * cssH };
    }

    const pts = new Float32Array(n * 2); // pixel space, for k-means and drawing
    const normPts = new Float32Array(n * 2); // [0,1] space, for DBSCAN
    const finalNorm = new Float32Array(n * 2); // settled positions for static mode
    const curGrey = new Float32Array(n).fill(theme === "dark" ? 170 : 90);
    const assignments = new Int32Array(n).fill(-1);
    let labels: Int32Array = new Int32Array(n).fill(-1);
    let k0 = clampK(paramsRef.current.k, n);
    let centroids = kmeansPlusPlus(fillPixels(), k0);

    function fillPixels(): Float32Array {
      for (let i = 0; i < n; i++) {
        pts[i * 2] = nodes[i].x;
        pts[i * 2 + 1] = nodes[i].y;
      }
      return pts;
    }

    function fillNorm(): Float32Array {
      for (let i = 0; i < n; i++) {
        normPts[i * 2] = nodes[i].x / cssW;
        normPts[i * 2 + 1] = nodes[i].y / cssH;
      }
      return normPts;
    }

    const centeringX = forceX<ClusterNode>(cssW / 2).strength(0.012);
    const centeringY = forceY<ClusterNode>(cssH / 2).strength(0.012);
    const sim = forceSimulation<ClusterNode>(nodes)
      .alpha(0.4)
      .alphaDecay(0)
      .velocityDecay(0.62)
      .force("charge", forceManyBody<ClusterNode>().strength(-3).distanceMax(180))
      .force("x", centeringX)
      .force("y", centeringY)
      .force("pointer", createPointerForce(pointerRef, POINTER_RADIUS))
      .stop();

    function applySize() {
      cssW = container!.clientWidth || 1;
      cssH = container!.clientHeight || 1;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas!.width = Math.round(cssW * dpr);
      canvas!.height = Math.round(cssH * dpr);
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
      centeringX.x(cssW / 2);
      centeringY.y(cssH / 2);
    }

    function stepColors() {
      const { algorithm: algo, theme: th } = paramsRef.current;
      const ramp = buildRamp(th);
      const noise = ramp[RAMP_STEPS - 1];
      for (let i = 0; i < n; i++) {
        let target: number;
        if (algo === "kmeans") {
          const a = assignments[i];
          target = ramp[(a >= 0 ? a : 0) % RAMP_STEPS];
        } else {
          const l = labels[i];
          target = l < 0 ? noise : ramp[l % RAMP_STEPS];
        }
        curGrey[i] += (target - curGrey[i]) * COLOR_LERP;
      }
    }

    function snapColors() {
      const { algorithm: algo, theme: th } = paramsRef.current;
      const ramp = buildRamp(th);
      const noise = ramp[RAMP_STEPS - 1];
      for (let i = 0; i < n; i++) {
        if (algo === "kmeans") {
          const a = assignments[i];
          curGrey[i] = ramp[(a >= 0 ? a : 0) % RAMP_STEPS];
        } else {
          const l = labels[i];
          curGrey[i] = l < 0 ? noise : ramp[l % RAMP_STEPS];
        }
      }
    }

    function draw() {
      const { algorithm: algo, theme: th } = paramsRef.current;
      ctx!.clearRect(0, 0, cssW, cssH);
      for (let i = 0; i < n; i++) {
        const g = Math.round(curGrey[i]);
        ctx!.fillStyle = `rgb(${g},${g},${g})`;
        ctx!.beginPath();
        ctx!.arc(nodes[i].x, nodes[i].y, POINT_RADIUS, 0, TAU);
        ctx!.fill();
      }
      if (algo === "kmeans") {
        const ramp = buildRamp(th);
        ctx!.lineWidth = 1;
        ctx!.strokeStyle =
          th === "dark" ? "rgba(250,250,250,0.55)" : "rgba(10,10,10,0.55)";
        for (let c = 0; c < k0; c++) {
          const g = ramp[c % RAMP_STEPS];
          ctx!.beginPath();
          ctx!.arc(centroids[c * 2], centroids[c * 2 + 1], CENTROID_RADIUS, 0, TAU);
          ctx!.fillStyle = `rgb(${g},${g},${g})`;
          ctx!.fill();
          ctx!.stroke();
        }
      }
    }

    function frame() {
      sim.tick();
      fillPixels();

      const wantK = clampK(paramsRef.current.k, n);
      if (wantK !== k0) {
        k0 = wantK;
        centroids = kmeansPlusPlus(pts, k0);
      }
      kmeansStep(pts, centroids, assignments);

      if (frameCount % DBSCAN_EVERY === 0) {
        fillNorm();
        labels = dbscan(
          normPts,
          paramsRef.current.epsilon,
          paramsRef.current.minPts,
          { labels },
        ).labels;
      }

      stepColors();
      draw();
      frameCount += 1;
    }

    let frameCount = 0;
    let rafId: number | null = null;
    let visible = true;

    function tickLoop() {
      frame();
      rafId = requestAnimationFrame(tickLoop);
    }
    function start() {
      if (rafId === null && visible && !document.hidden) {
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
      for (let t = 0; t < SETTLE_TICKS; t++) sim.tick();
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
          k0 = clampK(paramsRef.current.k, n);
          centroids = kmeansPlusPlus(pts, k0);
          for (let it = 0; it < 60; it++) {
            if (!kmeansStep(pts, centroids, assignments)) break;
          }
          for (let i = 0; i < n; i++) {
            normPts[i * 2] = finalNorm[i * 2];
            normPts[i * 2 + 1] = finalNorm[i * 2 + 1];
          }
          labels = dbscan(
            normPts,
            paramsRef.current.epsilon,
            paramsRef.current.minPts,
            { labels },
          ).labels;
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

      return () => {
        ro.disconnect();
        renderStaticRef.current = null;
        sim.stop();
      };
    }

    // ---- Animated path: rAF loop with off-screen and hidden pausing. ----
    const ro = new ResizeObserver(() => applySize());
    ro.observe(container);

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

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onPointerLeave() {
      pointerRef.current = null;
    }
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
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
      <canvas ref={canvasRef} className="block h-full w-full" />
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
