// Metric callouts for case studies, used inside MDX as <Stats><Stat .../></Stats>.
// Greyscale, hairline-separated, on the design system. Uses divs (not p) so the
// Prose element styles do not add stray margins.
export function Stats({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 grid gap-px border border-rule bg-rule sm:grid-cols-3">
      {children}
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-page p-6">
      <div className="font-serif text-h2 leading-none">{value}</div>
      <div className="mt-3 font-mono text-label uppercase text-muted">
        {label}
      </div>
    </div>
  );
}

export const mdxComponents = { Stat, Stats };
