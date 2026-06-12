"use client";

import dynamic from "next/dynamic";
import type { PaletteItems } from "./CommandPalette";

// Portal, localStorage, and keyboard listeners are browser-only, so this
// client wrapper loads the palette with SSR disabled. The chunk starts
// loading on hydration, well before the first Cmd+K.
const CommandPalette = dynamic(() => import("./CommandPalette"), {
  ssr: false,
});

export default function CommandPaletteLazy({
  items,
}: {
  items: PaletteItems;
}) {
  return <CommandPalette items={items} />;
}
