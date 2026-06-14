import Image from "next/image";
import type { Field } from "@/lib/admin/fields";
import DeleteButton from "./DeleteButton";

type Row = Record<string, unknown>;

const labelClass = "font-mono text-label uppercase text-muted";
const inputClass =
  "w-full border border-rule bg-page px-3 py-2 text-body text-ink outline-none focus-visible:border-ink";

function initial(row: Row | null, name: string): string {
  if (!row) return "";
  const v = row[name];
  if (v == null) return "";
  if (Array.isArray(v)) return v.join("\n");
  if (name === "date" || name === "updated") return String(v).slice(0, 10);
  return String(v);
}

function FieldRow({ field, row }: { field: Field; row: Row | null }) {
  const value = initial(row, field.name);
  const id = `f-${field.name}`;
  let control;

  if (field.type === "textarea") {
    control = (
      <textarea id={id} name={field.name} defaultValue={value} rows={3} className={inputClass} required={field.required} />
    );
  } else if (field.type === "markdown") {
    control = (
      <textarea id={id} name={field.name} defaultValue={value} rows={18} className={`${inputClass} font-mono text-sm`} />
    );
  } else if (field.type === "list") {
    control = (
      <textarea id={id} name={field.name} defaultValue={value} rows={3} className={inputClass} required={field.required} />
    );
  } else if (field.type === "select") {
    control = (
      <select id={id} name={field.name} defaultValue={value} className={inputClass} required={field.required}>
        <option value="">Select…</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  } else if (field.type === "image") {
    control = (
      <div className="flex flex-col gap-3">
        {value && (
          <div className="relative aspect-[16/10] w-full max-w-xs border border-rule bg-rule/40">
            <Image src={value} alt="" fill className="object-cover" unoptimized />
          </div>
        )}
        <input type="hidden" name={field.name} defaultValue={value} />
        <input type="file" name={`${field.name}__file`} accept="image/*" className="text-sm text-muted file:mr-3 file:border file:border-rule file:bg-page file:px-3 file:py-1.5 file:font-mono file:text-label file:uppercase file:text-ink" />
      </div>
    );
  } else {
    const type = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : "text";
    control = (
      <input id={id} name={field.name} type={type} defaultValue={value} className={inputClass} required={field.required} />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelClass}>
        {field.label}
        {field.required ? " *" : ""}
      </label>
      {control}
      {field.help && <p className="text-sm text-muted">{field.help}</p>}
    </div>
  );
}

export default function EntryForm({
  fields,
  row,
  action,
  deleteAction,
  showPublished = true,
  submitLabel = "Save",
}: {
  fields: Field[];
  row: Row | null;
  action: (formData: FormData) => void;
  deleteAction?: () => void;
  showPublished?: boolean;
  submitLabel?: string;
}) {
  const published = row ? row.published !== false : true;
  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-6">
        {row?.id != null && (
          <input type="hidden" name="id" defaultValue={String(row.id)} />
        )}
        {fields.map((field) => (
          <FieldRow key={field.name} field={field} row={row} />
        ))}

        {showPublished && (
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="published"
              defaultChecked={published}
              className="h-4 w-4 accent-ink"
            />
            <span className={labelClass}>Published (visible on the site)</span>
          </label>
        )}

        <div className="flex items-center gap-4 border-t border-rule pt-6">
          <button
            type="submit"
            className="border border-ink bg-ink px-5 py-3 font-mono text-label uppercase text-page transition-colors duration-200 hover:bg-page hover:text-ink focus-visible:outline-ink"
          >
            {submitLabel}
          </button>
        </div>
      </form>

      {deleteAction && (
        <div className="border-t border-rule pt-6">
          <DeleteButton action={deleteAction} />
        </div>
      )}
    </div>
  );
}
