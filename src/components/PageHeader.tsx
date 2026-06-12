export default function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <header className="max-w-2xl">
      <p className="font-mono text-label uppercase text-muted">{eyebrow}</p>
      <h1 className="mt-3 font-serif text-h1">{title}</h1>
      {intro && <p className="mt-6 text-body text-muted">{intro}</p>}
    </header>
  );
}
