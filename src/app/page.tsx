import ClusterCanvasLazy from "@/components/signatures/ClusterCanvasLazy";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink">
      <div className="absolute inset-0">
        <ClusterCanvasLazy algorithm="kmeans" pointCount={500} theme="dark" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <h1 className="font-serif italic text-display text-page">ochudi</h1>
      </div>
    </main>
  );
}
