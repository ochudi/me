import { describe, it, expect } from "vitest";
import { kmeans, kmeansPlusPlus, kmeansStep } from "./kmeans";
import { dbscan } from "./dbscan";

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
});
