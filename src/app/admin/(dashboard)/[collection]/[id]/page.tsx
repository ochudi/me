import Link from "next/link";
import { notFound } from "next/navigation";
import EntryForm from "@/components/admin/EntryForm";
import { adminGet } from "@/lib/admin/data";
import { deleteEntry, saveEntry } from "@/lib/admin/actions";
import {
  COLLECTION_FIELDS,
  COLLECTION_LABEL,
  isCollectionKey,
} from "@/lib/admin/fields";

export default async function EntryEditor({
  params,
}: {
  params: Promise<{ collection: string; id: string }>;
}) {
  const { collection, id } = await params;
  if (!isCollectionKey(collection)) notFound();

  const isNew = id === "new";
  const row = isNew ? null : await adminGet(collection, id);
  if (!isNew && !row) notFound();

  const action = saveEntry.bind(null, collection);
  const deleteAction =
    !isNew && row ? deleteEntry.bind(null, collection, String(row.id)) : undefined;

  return (
    <div>
      <Link
        href={`/admin/${collection}`}
        className="font-mono text-label uppercase text-muted transition-colors duration-200 hover:text-ink"
      >
        ← {COLLECTION_LABEL[collection]}
      </Link>
      <h1 className="mt-3 font-serif text-h1">
        {isNew ? `New ${collection} entry` : String(row?.title ?? "Edit entry")}
      </h1>

      <div className="mt-10">
        <EntryForm
          fields={COLLECTION_FIELDS[collection]}
          row={row}
          action={action}
          deleteAction={deleteAction}
          submitLabel={isNew ? "Create" : "Save changes"}
        />
      </div>
    </div>
  );
}
