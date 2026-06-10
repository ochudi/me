// k-means over flat Float32Array point data ([x0, y0, x1, y1, ...]).
// Pure functions, no dependencies, scale-invariant for assignment.

export type RNG = () => number;

export type KMeansResult = {
  /** k * 2 centroid coordinates. */
  centroids: Float32Array;
  /** One cluster index in [0, k) per point. */
  assignments: Int32Array;
};

function sqDist(points: Float32Array, i: number, cx: number, cy: number): number {
  const dx = points[i * 2] - cx;
  const dy = points[i * 2 + 1] - cy;
  return dx * dx + dy * dy;
}

/**
 * k-means++ seeding: spreads initial centroids across the data so Lloyd's
 * iteration converges to well-separated clusters instead of collapsing.
 */
export function kmeansPlusPlus(
  points: Float32Array,
  k: number,
  rng: RNG = Math.random,
): Float32Array {
  const n = points.length / 2;
  const centroids = new Float32Array(k * 2);
  if (n === 0 || k === 0) return centroids;

  const first = Math.min(n - 1, Math.floor(rng() * n));
  centroids[0] = points[first * 2];
  centroids[1] = points[first * 2 + 1];

  const nearest = new Float32Array(n).fill(Infinity);
  for (let c = 1; c < k; c++) {
    const px = centroids[(c - 1) * 2];
    const py = centroids[(c - 1) * 2 + 1];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const d = sqDist(points, i, px, py);
      if (d < nearest[i]) nearest[i] = d;
      total += nearest[i];
    }
    // Choose the next centroid with probability proportional to distance.
    let target = rng() * total;
    let idx = 0;
    for (let i = 0; i < n; i++) {
      target -= nearest[i];
      idx = i;
      if (target <= 0) break;
    }
    centroids[c * 2] = points[idx * 2];
    centroids[c * 2 + 1] = points[idx * 2 + 1];
  }
  return centroids;
}

/** Assign every point to its nearest centroid. Returns true if anything moved. */
export function assign(
  points: Float32Array,
  centroids: Float32Array,
  assignments: Int32Array,
): boolean {
  const n = points.length / 2;
  const k = centroids.length / 2;
  let changed = false;
  for (let i = 0; i < n; i++) {
    let best = 0;
    let bestD = Infinity;
    for (let c = 0; c < k; c++) {
      const d = sqDist(points, i, centroids[c * 2], centroids[c * 2 + 1]);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (assignments[i] !== best) {
      assignments[i] = best;
      changed = true;
    }
  }
  return changed;
}

/** Move each centroid to the mean of its members. Empty clusters stay put. */
export function updateCentroids(
  points: Float32Array,
  centroids: Float32Array,
  assignments: Int32Array,
): void {
  const n = points.length / 2;
  const k = centroids.length / 2;
  const sumX = new Float64Array(k);
  const sumY = new Float64Array(k);
  const count = new Int32Array(k);
  for (let i = 0; i < n; i++) {
    const c = assignments[i];
    if (c < 0 || c >= k) continue;
    sumX[c] += points[i * 2];
    sumY[c] += points[i * 2 + 1];
    count[c]++;
  }
  for (let c = 0; c < k; c++) {
    if (count[c] > 0) {
      centroids[c * 2] = sumX[c] / count[c];
      centroids[c * 2 + 1] = sumY[c] / count[c];
    }
  }
}

/** One Lloyd iteration in place. Returns true if any assignment changed. */
export function kmeansStep(
  points: Float32Array,
  centroids: Float32Array,
  assignments: Int32Array,
): boolean {
  const changed = assign(points, centroids, assignments);
  updateCentroids(points, centroids, assignments);
  return changed;
}

/** Run k-means to convergence. Used for tests and static converged frames. */
export function kmeans(
  points: Float32Array,
  k: number,
  options: { maxIterations?: number; rng?: RNG; centroids?: Float32Array } = {},
): KMeansResult {
  const n = points.length / 2;
  const maxIterations = options.maxIterations ?? 100;
  const centroids = options.centroids
    ? Float32Array.from(options.centroids)
    : kmeansPlusPlus(points, Math.max(1, Math.min(k, Math.max(1, n))), options.rng);
  const assignments = new Int32Array(n).fill(-1);
  for (let iter = 0; iter < maxIterations; iter++) {
    if (!kmeansStep(points, centroids, assignments)) break;
  }
  return { centroids, assignments };
}
