import Link from "next/link";
import { getAdminUser } from "@/lib/supabase/session";
import { adminCounts } from "@/lib/admin/data";
import { COLLECTION_KEYS, COLLECTION_LABEL } from "@/lib/admin/fields";

export default async function AdminDashboard() {
  const user = await getAdminUser();
  const counts = await adminCounts();

  const cards = [
    ...COLLECTION_KEYS.map((key) => ({
      href: `/admin/${key}`,
      label: COLLECTION_LABEL[key],
      meta: `${counts[key]} ${counts[key] === 1 ? "entry" : "entries"}`,
    })),
    { href: "/admin/now", label: "Now", meta: "The /now page" },
  ];

  return (
    <div>
      <p className="font-mono text-label uppercase text-muted">
        Signed in as {user?.email}
      </p>
      <h1 className="mt-3 font-serif text-h1">Maintain the site.</h1>
      <p className="mt-5 max-w-prose text-body text-muted">
        Pick a section to add or edit entries. Anything marked published shows
        on the live site within a minute. Drafts stay private.
      </p>

      <div className="mt-12 grid gap-px border border-rule bg-rule sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col gap-2 bg-page p-8 transition-colors duration-200 hover:bg-rule/30 focus-visible:outline-ink"
          >
            <span className="font-serif text-h2 group-hover:underline">
              {card.label}
            </span>
            <span className="font-mono text-label uppercase text-muted">
              {card.meta}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
