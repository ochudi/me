// DBSCAN over flat Float32Array point data ([x0, y0, x1, y1, ...]).
// Pure, no dependencies. Region queries run on a uniform grid with cells
// near epsilon wide, so each query touches a handful of cells instead of
// every point. Epsilon is expressed in point space.

export type DBSCANResult = {
  /** -1 for noise, otherwise a cluster id in [0, clusterCount). */
  labels: Int32Array;
  clusterCount: number;
};

const NOISE = -1;
const UNVISITED = -2;

/** Caps grid memory when epsilon is tiny relative to the data extent. */
const MAX_CELLS_PER_AXIS = 256;

/**
 * Density-based clustering. A point is a core point when at least `minPts`
 * points (including itself) lie within `epsilon`. Clusters grow outward from
 * core points; everything unreachable is labelled noise (-1).
 *
 * Pass `options.labels` to reuse an existing buffer between runs.
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
  if (n === 0) return { labels, clusterCount: 0 };

  const eps = epsilon > 0 ? epsilon : Number.MIN_VALUE;
  const eps2 = eps * eps;

  let minX = points[0];
  let maxX = points[0];
  let minY = points[1];
  let maxY = points[1];
  for (let i = 1; i < n; i++) {
    const x = points[i * 2];
    const y = points[i * 2 + 1];
    if (x < minX) minX = x;
    else if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    else if (y > maxY) maxY = y;
  }

  const cols = Math.min(
    MAX_CELLS_PER_AXIS,
    Math.max(1, Math.floor((maxX - minX) / eps) + 1),
  );
  const rows = Math.min(
    MAX_CELLS_PER_AXIS,
    Math.max(1, Math.floor((maxY - minY) / eps) + 1),
  );
  const cellW = (maxX - minX) / cols || eps;
  const cellH = (maxY - minY) / rows || eps;
  // Cells can be narrower than epsilon when the axis cap kicks in, so a
  // query may need to look more than one cell out.
  const spanX = Math.max(1, Math.ceil(eps / cellW));
  const spanY = Math.max(1, Math.ceil(eps / cellH));

  const colOf = (x: number) => {
    const c = Math.floor((x - minX) / cellW);
    return c < 0 ? 0 : c >= cols ? cols - 1 : c;
  };
  const rowOf = (y: number) => {
    const r = Math.floor((y - minY) / cellH);
    return r < 0 ? 0 : r >= rows ? rows - 1 : r;
  };

  // Bucket points by cell in CSR layout: indices of cell c's points sit in
  // byCell[cellStart[c] .. cellStart[c + 1]).
  const cellCount = cols * rows;
  const cellOf = new Int32Array(n);
  const cellStart = new Int32Array(cellCount + 1);
  for (let i = 0; i < n; i++) {
    const cell = rowOf(points[i * 2 + 1]) * cols + colOf(points[i * 2]);
    cellOf[i] = cell;
    cellStart[cell + 1]++;
  }
  for (let c = 0; c < cellCount; c++) cellStart[c + 1] += cellStart[c];
  const byCell = new Int32Array(n);
  const cursor = cellStart.slice(0, cellCount);
  for (let i = 0; i < n; i++) byCell[cursor[cellOf[i]]++] = i;

  function regionQuery(i: number, out: number[]): void {
    out.length = 0;
    const xi = points[i * 2];
    const yi = points[i * 2 + 1];
    const cc = colOf(xi);
    const cr = rowOf(yi);
    const c0 = Math.max(0, cc - spanX);
    const c1 = Math.min(cols - 1, cc + spanX);
    const r0 = Math.max(0, cr - spanY);
    const r1 = Math.min(rows - 1, cr + spanY);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = r * cols + c;
        for (let s = cellStart[cell]; s < cellStart[cell + 1]; s++) {
          const j = byCell[s];
          const dx = points[j * 2] - xi;
          const dy = points[j * 2 + 1] - yi;
          if (dx * dx + dy * dy <= eps2) out.push(j);
        }
      }
    }
  }

  const neighbors: number[] = [];
  const inner: number[] = [];
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    regionQuery(i, neighbors);
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
      regionQuery(j, inner);
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

/**
 * Rewrites `next` cluster ids in place so they line up with `prev` where the
 * clusters overlap. DBSCAN ids depend on scan order, so the same cluster can
 * come back under a different id on the next run; matching ids by greatest
 * member overlap keeps downstream colour mappings steady. New clusters get
 * the smallest ids not claimed by a surviving cluster. Noise stays -1.
 */
export function stabilizeLabels(prev: Int32Array, next: Int32Array): void {
  const n = Math.min(prev.length, next.length);
  const overlaps = new Map<number, Map<number, number>>();
  let maxNext = -1;
  for (let i = 0; i < n; i++) {
    const q = next[i];
    if (q < 0) continue;
    if (q > maxNext) maxNext = q;
    const p = prev[i];
    if (p < 0) continue;
    let row = overlaps.get(q);
    if (!row) {
      row = new Map();
      overlaps.set(q, row);
    }
    row.set(p, (row.get(p) ?? 0) + 1);
  }
  if (maxNext < 0) return;

  const candidates: Array<{ q: number; p: number; count: number }> = [];
  overlaps.forEach((row, q) =>
    row.forEach((count, p) => candidates.push({ q, p, count })),
  );
  candidates.sort((a, b) => b.count - a.count || a.q - b.q || a.p - b.p);

  const mapping = new Int32Array(maxNext + 1).fill(-1);
  const usedPrev = new Set<number>();
  for (const { q, p } of candidates) {
    if (mapping[q] !== -1 || usedPrev.has(p)) continue;
    mapping[q] = p;
    usedPrev.add(p);
  }
  let fresh = 0;
  for (let q = 0; q <= maxNext; q++) {
    if (mapping[q] !== -1) continue;
    while (usedPrev.has(fresh)) fresh++;
    mapping[q] = fresh;
    usedPrev.add(fresh);
  }

  for (let i = 0; i < next.length; i++) {
    if (next[i] >= 0) next[i] = mapping[next[i]];
  }
}
