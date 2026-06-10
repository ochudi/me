"use client";

import type { ClusterAlgorithm, ClusterTheme } from "./ClusterCanvas";
import styles from "./cluster.module.css";

type ClusterControlsProps = {
  algorithm: ClusterAlgorithm;
  k: number;
  epsilon: number;
  minPts: number;
  theme: ClusterTheme;
  onAlgorithm: (next: ClusterAlgorithm) => void;
  onK: (next: number) => void;
  onEpsilon: (next: number) => void;
  onMinPts: (next: number) => void;
};

const labelClass = "font-mono text-label uppercase";

export default function ClusterControls({
  algorithm,
  k,
  epsilon,
  minPts,
  theme,
  onAlgorithm,
  onK,
  onEpsilon,
  onMinPts,
}: ClusterControlsProps) {
  const tone = theme === "dark" ? "text-page" : "text-ink";

  return (
    <div
      className={`pointer-events-auto absolute bottom-6 left-6 flex flex-col gap-4 ${tone}`}
    >
      <button
        type="button"
        onClick={() =>
          onAlgorithm(algorithm === "kmeans" ? "dbscan" : "kmeans")
        }
        aria-pressed={algorithm === "dbscan"}
        className={`${labelClass} flex w-fit items-center gap-2`}
      >
        <span className={algorithm === "kmeans" ? "opacity-100" : "opacity-40"}>
          K-MEANS
        </span>
        <span aria-hidden className="opacity-40">
          /
        </span>
        <span className={algorithm === "dbscan" ? "opacity-100" : "opacity-40"}>
          DBSCAN
        </span>
      </button>

      {algorithm === "kmeans" ? (
        <label className="flex items-center gap-3">
          <span className={`${labelClass} w-16`}>k {k}</span>
          <input
            type="range"
            className={styles.range}
            min={2}
            max={8}
            step={1}
            value={k}
            onChange={(e) => onK(Number(e.target.value))}
            aria-label="Number of clusters"
          />
        </label>
      ) : (
        <>
          <label className="flex items-center gap-3">
            <span className={`${labelClass} w-16`}>
              EPS {epsilon.toFixed(2)}
            </span>
            <input
              type="range"
              className={styles.range}
              min={0.05}
              max={0.5}
              step={0.01}
              value={epsilon}
              onChange={(e) => onEpsilon(Number(e.target.value))}
              aria-label="DBSCAN epsilon radius"
            />
          </label>
          <label className="flex items-center gap-3">
            <span className={`${labelClass} w-16`}>MIN {minPts}</span>
            <input
              type="range"
              className={styles.range}
              min={2}
              max={10}
              step={1}
              value={minPts}
              onChange={(e) => onMinPts(Number(e.target.value))}
              aria-label="DBSCAN minimum points"
            />
          </label>
        </>
      )}
    </div>
  );
}
