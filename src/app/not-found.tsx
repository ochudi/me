import type { Metadata } from "next";
import Link from "next/link";
import ErrorScreen from "@/components/ErrorScreen";

export const metadata: Metadata = {
  title: "404",
  description: "No such page.",
};

const ghostLinkDark =
  "border border-rule-dark px-5 py-3 font-mono text-label uppercase text-page transition-colors duration-200 hover:border-page/70 focus-visible:outline-page";

export default function NotFound() {
  return (
    <ErrorScreen code="Error 404" title="No such page.">
      <p
        className="hero-rise mt-6 max-w-prose text-body text-page/70"
        style={{ animationDelay: "200ms" }}
      >
        The page moved, or it never existed. The command palette knows
        everything that does: press Cmd K.
      </p>
      <div
        className="hero-rise mt-10 flex flex-wrap justify-center gap-4"
        style={{ animationDelay: "280ms" }}
      >
        <Link href="/" className={ghostLinkDark}>
          Back home
        </Link>
        <Link href="/writing" className={ghostLinkDark}>
          Read writing
        </Link>
      </div>
    </ErrorScreen>
  );
}
