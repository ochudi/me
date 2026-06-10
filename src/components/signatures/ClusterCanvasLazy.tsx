"use client";

import dynamic from "next/dynamic";
import type { ClusterCanvasProps } from "./ClusterCanvas";

// Canvas, ResizeObserver, and devicePixelRatio are browser-only, so this
// client wrapper loads the component with SSR disabled.
const ClusterCanvas = dynamic(() => import("./ClusterCanvas"), {
  ssr: false,
  loading: () => <div aria-hidden className="h-full w-full" />,
});

export default function ClusterCanvasLazy(props: ClusterCanvasProps) {
  return <ClusterCanvas {...props} />;
}
