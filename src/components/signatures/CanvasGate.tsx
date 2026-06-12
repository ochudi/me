"use client";

import { useEffect, useState } from "react";
import ClusterCanvasLazy from "./ClusterCanvasLazy";
import type { ClusterCanvasProps } from "./ClusterCanvas";

// Mounts the canvas only at 640px and up, so phones never download or run
// its chunk. Below that the hero shows the CSS dot field instead, which
// paints with the first frame and keeps the headline as the LCP element.
export default function CanvasGate(props: ClusterCanvasProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) setShow(true);
  }, []);

  return show ? <ClusterCanvasLazy {...props} /> : null;
}
