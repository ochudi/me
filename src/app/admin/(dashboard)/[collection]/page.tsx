import Link from "next/link";
import { notFound } from "next/navigation";
import { adminList } from "@/lib/admin/data";
import { COLLECTION_LABEL, isCollectionKey } from "@/lib/admin/fields";

export default async function CollectionList({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  if (!isCollectionKey(collection)) notFound();
  const rows = await adminList(collection);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-label uppercase text-muted">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </p>
          <h1 className="mt-2 font-serif text-h1">
            {COLLECTION_LABEL[collection]}
          </h1>
        </div>
        <Link
          href={`/admin/${collection}/new`}
          className="border border-ink bg-ink px-5 py-3 font-mono text-label uppercase text-page transition-colors duration-200 hover:bg-page hover:text-ink focus-visible:outline-ink"
        >
          New entry
        </Link>
      </div>

      <ul className="mt-10 border-t border-rule">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-rule">
            <Link
              href={`/admin/${collection}/${row.id}`}
              className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5 transition-colors duration-200 hover:bg-rule/20 focus-visible:outline-ink"
            >
              <span className="font-serif text-h3 group-hover:underline">
                {String(row.title ?? row.slug ?? "Untitled")}
              </span>
              <span className="flex items-center gap-4 font-mono text-label uppercase text-muted">
                <span>{String(row.date ?? "").slice(0, 10)}</span>
                <span className={row.published === false ? "text-muted" : "text-ink"}>
                  {row.published === false ? "Draft" : "Published"}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-8 text-body text-muted">
            Nothing here yet. Create the first entry.
          </li>
        )}
      </ul>
    </div>
  );
}
