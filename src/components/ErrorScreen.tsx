import { Logo } from "@/components/Logo";

// Shared full-screen frame for the 404 and error routes. Server-safe and
// presentational: the error route wraps it in a client component to pass a
// reset button as a child. The dot field and entrance animations are pure
// CSS (hero-rise / dot-field from globals.css), so the page paints and
// animates before hydration and stays still under reduced motion.
export default function ErrorScreen({
  code,
  title,
  children,
}: {
  code: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center text-page">
      {/* Signature dot field, dimmed and faded at the edges so the copy on
          top stays legible. */}
      <div
        aria-hidden
        className="dot-field absolute inset-0 opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]"
      />

      <div className="relative flex flex-col items-center">
        <Logo
          variant="mark"
          size={40}
          animate
          className="hero-rise text-page"
        />
        <p
          className="hero-rise mt-8 font-mono text-label uppercase text-page/60"
          style={{ animationDelay: "60ms" }}
        >
          {code}
        </p>
        <h1
          className="hero-word mt-4 font-serif text-display italic"
          style={{ animationDelay: "120ms" }}
        >
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
