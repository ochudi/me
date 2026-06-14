import EntryForm from "@/components/admin/EntryForm";
import { adminGetNow } from "@/lib/admin/data";
import { saveNow } from "@/lib/admin/actions";
import { NOW_FIELDS } from "@/lib/admin/fields";

export default async function NowEditor() {
  const row = await adminGetNow();

  return (
    <div>
      <p className="font-mono text-label uppercase text-muted">Single page</p>
      <h1 className="mt-2 font-serif text-h1">Now</h1>
      <p className="mt-5 max-w-prose text-body text-muted">
        What you are focused on this week. Drives the dashboard on the home and
        /now pages.
      </p>

      <div className="mt-10">
        <EntryForm fields={NOW_FIELDS} row={row} action={saveNow} />
      </div>
    </div>
  );
}
