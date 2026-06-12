import { describe, it, expect } from "vitest";
import {
  kmeans,
  kmeansPlusPlus,
  kmeansStep,
  resizeCentroids,
} from "./kmeans";
import { dbscan, stabilizeLabels } from "./dbscan";

// Deterministic RNG so seeded paths are reproducible across runs.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two tight, well-separated blobs: indices 0-4 near (0,0), 5-9 near (10,10).
function twoBlobs(): Float32Array {
  const pts: number[] = [];
  const a = [0, 0];
  const b = [10, 10];
  for (let i = 0; i < 5; i++) pts.push(a[0] + i * 0.01, a[1] - i * 0.01);
  for (let i = 0; i < 5; i++) pts.push(b[0] + i * 0.01, b[1] - i * 0.01);
  return new Float32Array(pts);
}

describe("kmeans", () => {
  it("separates two blobs into two clusters", () => {
    const points = twoBlobs();
    // Seed one centroid in each blob so convergence is deterministic.
    const { assignments, centroids } = kmeans(points, 2, {
      centroids: new Float32Array([0, 0, 10, 10]),
    });

    expect(assignments).toHaveLength(10);
    const groupA = assignments[0];
    const groupB = assignments[5];
    expect(groupA).not.toBe(groupB);
    for (let i = 0; i < 5; i++) expect(assignments[i]).toBe(groupA);
    for (let i = 5; i < 10; i++) expect(assignments[i]).toBe(groupB);

    // Centroids land on each blob centre (within the blob's tiny spread).
    expect(centroids[groupA * 2]).toBeCloseTo(0.02, 1);
    expect(centroids[groupB * 2]).toBeCloseTo(10.02, 1);
  });

  it("kmeans++ returns k centroids drawn from the data", () => {
    const points = twoBlobs();
    const centroids = kmeansPlusPlus(points, 2, mulberry32(42));
    expect(centroids).toHaveLength(4);
    // Each seeded centroid coincides with some input point.
    for (let c = 0; c < 2; c++) {
      let matched = false;
      for (let i = 0; i < 10; i++) {
        if (
          Math.abs(centroids[c * 2] - points[i * 2]) < 1e-6 &&
          Math.abs(centroids[c * 2 + 1] - points[i * 2 + 1]) < 1e-6
        ) {
          matched = true;
          break;
        }
      }
      expect(matched).toBe(true);
    }
  });

  it("kmeansStep reports convergence by returning false", () => {
    const points = twoBlobs();
    const centroids = new Float32Array([0, 0, 10, 10]);
    const assignments = new Int32Array(10).fill(-1);
    kmeansStep(points, centroids, assignments); // first pass assigns everything
    expect(kmeansStep(points, centroids, assignments)).toBe(false);
  });

  it("handles empty input", () => {
    const { assignments } = kmeans(new Float32Array(0), 3);
    expect(assignments).toHaveLength(0);
  });
});

describe("resizeCentroids", () => {
  it("truncates but preserves survivors when shrinking", () => {
    const points = twoBlobs();
    const centroids = new Float32Array([0, 0, 10, 10, 5, 5]);
    const out = resizeCentroids(points, centroids, 2, mulberry32(1));
    expect(Array.from(out)).toEqual([0, 0, 10, 10]);
  });

  it("preserves existing centroids and seeds new ones from the data", () => {
    const points = twoBlobs();
    const centroids = new Float32Array([0, 0]);
    const out = resizeCentroids(points, centroids, 3, mulberry32(7));
    expect(out).toHaveLength(6);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0);
    // Each added centroid coincides with some input point.
    for (let c = 1; c < 3; c++) {
      let matched = false;
      for (let i = 0; i < 10; i++) {
        if (
          Math.abs(out[c * 2] - points[i * 2]) < 1e-6 &&
          Math.abs(out[c * 2 + 1] - points[i * 2 + 1]) < 1e-6
        ) {
          matched = true;
          break;
        }
      }
      expect(matched).toBe(true);
    }
  });

  it("returns the same buffer when k is unchanged", () => {
    const points = twoBlobs();
    const centroids = new Float32Array([0, 0, 10, 10]);
    expect(resizeCentroids(points, centroids, 2)).toBe(centroids);
  });
});

describe("dbscan", () => {
  // Two dense blobs in [0,1] space plus one far outlier.
  function densePoints(): Float32Array {
    const pts: number[] = [];
    for (let i = 0; i < 6; i++) pts.push(0.1 + i * 0.01, 0.1 + i * 0.01);
    for (let i = 0; i < 6; i++) pts.push(0.8 + i * 0.01, 0.8 + i * 0.01);
    pts.push(0.5, 0.0); // isolated outlier
    return new Float32Array(pts);
  }

  it("finds two clusters and marks the outlier as noise", () => {
    const { labels, clusterCount } = dbscan(densePoints(), 0.1, 3);
    expect(clusterCount).toBe(2);

    const groupA = labels[0];
    const groupB = labels[6];
    expect(groupA).toBeGreaterThanOrEqual(0);
    expect(groupB).toBeGreaterThanOrEqual(0);
    expect(groupA).not.toBe(groupB);
    for (let i = 0; i < 6; i++) expect(labels[i]).toBe(groupA);
    for (let i = 6; i < 12; i++) expect(labels[i]).toBe(groupB);
    expect(labels[12]).toBe(-1);
  });

  it("reuses a provided labels buffer", () => {
    const points = densePoints();
    const buffer = new Int32Array(points.length / 2);
    const { labels } = dbscan(points, 0.1, 3, { labels: buffer });
    expect(labels).toBe(buffer);
  });

  it("labels everything noise when minPts cannot be met", () => {
    const points = densePoints();
    const { labels, clusterCount } = dbscan(points, 0.1, 99);
    expect(clusterCount).toBe(0);
    expect(Array.from(labels).every((l) => l === -1)).toBe(true);
  });

  it("handles empty input", () => {
    const { labels, clusterCount } = dbscan(new Float32Array(0), 0.1, 3);
    expect(labels).toHaveLength(0);
    expect(clusterCount).toBe(0);
  });

  // Independent brute-force reference with the same core/border semantics,
  // used to check the grid-accelerated region queries change nothing.
  function dbscanNaive(
    points: Float32Array,
    eps: number,
    minPts: number,
  ): Int32Array {
    const n = points.length / 2;
    const labels = new Int32Array(n).fill(-2);
    const eps2 = eps * eps;
    const query = (i: number) => {
      const out: number[] = [];
      for (let j = 0; j < n; j++) {
        const dx = points[j * 2] - points[i * 2];
        const dy = points[j * 2 + 1] - points[i * 2 + 1];
        if (dx * dx + dy * dy <= eps2) out.push(j);
      }
      return out;
    };
    let cid = 0;
    for (let i = 0; i < n; i++) {
      if (labels[i] !== -2) continue;
      const nb = query(i);
      if (nb.length < minPts) {
        labels[i] = -1;
        continue;
      }
      const c = cid++;
      labels[i] = c;
      const queue = [...nb];
      for (let qi = 0; qi < queue.length; qi++) {
        const j = queue[qi];
        if (labels[j] === -1) labels[j] = c;
        if (labels[j] !== -2) continue;
        labels[j] = c;
        const nb2 = query(j);
        if (nb2.length >= minPts) queue.push(...nb2);
      }
    }
    for (let i = 0; i < n; i++) if (labels[i] === -2) labels[i] = -1;
    return labels;
  }

  it("grid-accelerated queries match a brute-force reference", () => {
    const rng = mulberry32(7);
    const n = 160;
    const points = new Float32Array(n * 2);
    const cx = [0.25, 0.75, 0.5];
    const cy = [0.25, 0.3, 0.8];
    for (let i = 0; i < n; i++) {
      if (i % 4 === 3) {
        // scattered noise
        points[i * 2] = rng();
        points[i * 2 + 1] = rng();
      } else {
        const b = i % 3;
        points[i * 2] = cx[b] + (rng() - 0.5) * 0.12;
        points[i * 2 + 1] = cy[b] + (rng() - 0.5) * 0.12;
      }
    }

    const configs: Array<[number, number]> = [
      [0.08, 4],
      [0.3, 3],
      [0.05, 2],
    ];
    for (const [eps, minPts] of configs) {
      const { labels } = dbscan(points, eps, minPts);
      const reference = dbscanNaive(points, eps, minPts);
      expect(Array.from(labels)).toEqual(Array.from(reference));
    }
  });
});

describe("stabilizeLabels", () => {
  it("restores previous ids when clusters come back in a different order", () => {
    const prev = new Int32Array([0, 0, 0, 1, 1, -1]);
    const next = new Int32Array([1, 1, 1, 0, 0, -1]);
    stabilizeLabels(prev, next);
    expect(Array.from(next)).toEqual([0, 0, 0, 1, 1, -1]);
  });

  it("gives new clusters ids that do not collide with survivors", () => {
    const prev = new Int32Array([1, 1, -1]);
    const next = new Int32Array([0, 0, 1]);
    stabilizeLabels(prev, next);
    expect(Array.from(next)).toEqual([1, 1, 0]);
  });

  it("maps each new cluster to its dominant predecessor", () => {
    // New cluster 0 mostly overlaps old 2; new cluster 1 mostly overlaps old 0.
    const prev = new Int32Array([2, 2, 2, 0, 0, 0, 0]);
    const next = new Int32Array([0, 0, 0, 0, 1, 1, 1]);
    stabilizeLabels(prev, next);
    expect(Array.from(next)).toEqual([2, 2, 2, 2, 0, 0, 0]);
  });

  it("leaves noise untouched", () => {
    const prev = new Int32Array([-1, -1, 0]);
    const next = new Int32Array([-1, 0, 0]);
    stabilizeLabels(prev, next);
    expect(next[0]).toBe(-1);
  });

  it("handles an all-noise next run", () => {
    const prev = new Int32Array([0, 1, -1]);
    const next = new Int32Array([-1, -1, -1]);
    stabilizeLabels(prev, next);
    expect(Array.from(next)).toEqual([-1, -1, -1]);
  });
});
