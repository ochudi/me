// DBSCAN over flat Float32Array point data ([x0, y0, x1, y1, ...]).
// Pure, no dependencies. Brute-force region queries (O(n^2)) are ample for
// the few hundred points this drives; epsilon is expressed in point space.

export type DBSCANResult = {
  /** -1 for noise, otherwise a cluster id in [0, clusterCount). */
  labels: Int32Array;
  clusterCount: number;
};

const NOISE = -1;
const UNVISITED = -2;

function regionQuery(
  points: Float32Array,
  i: number,
  eps2: number,
  out: number[],
): void {
  out.length = 0;
  const n = points.length / 2;
  const xi = points[i * 2];
  const yi = points[i * 2 + 1];
  for (let j = 0; j < n; j++) {
    const dx = points[j * 2] - xi;
    const dy = points[j * 2 + 1] - yi;
    if (dx * dx + dy * dy <= eps2) out.push(j);
  }
}

/**
 * Density-based clustering. A point is a core point when at least `minPts`
 * points (including itself) lie within `epsilon`. Clusters grow outward from
 * core points; everything unreachable is labelled noise (-1).
 *
 * Pass `options.labels` to reuse an existing buffer between frames.
 */
export function dbscan(
  points: Float32Array,
  epsilon: number,
  minPts: number,
  options: { labels?: Int32Array } = {},
): DBSCANResult {
  const n = points.length / 2;
  const labels =
    options.labels && options.labels.length === n
      ? options.labels
      : new Int32Array(n);
  labels.fill(UNVISITED);

  const eps2 = epsilon * epsilon;
  const neighbors: number[] = [];
  const inner: number[] = [];
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    regionQuery(points, i, eps2, neighbors);
    if (neighbors.length < minPts) {
      labels[i] = NOISE;
      continue;
    }

    const cid = clusterId++;
    labels[i] = cid;

    // Breadth-first expansion. `queue` grows as new core points are found.
    const queue = neighbors.slice();
    for (let q = 0; q < queue.length; q++) {
      const j = queue[q];
      if (labels[j] === NOISE) labels[j] = cid; // border point of this cluster
      if (labels[j] !== UNVISITED) continue;
      labels[j] = cid;
      regionQuery(points, j, eps2, inner);
      if (inner.length >= minPts) {
        for (let m = 0; m < inner.length; m++) queue.push(inner[m]);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] === UNVISITED) labels[i] = NOISE;
  }
  return { labels, clusterCount: clusterId };
}
