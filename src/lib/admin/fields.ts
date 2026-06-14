// Single source of truth for the admin forms. The editor renders from this
// config and the save action parses FormData from it, so changing a field is
// a one-line edit here — nothing else to touch. This is what keeps the admin
// cheap to maintain and safe to hand to someone else.
import { WORK_TYPES } from "@/lib/content";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "list"
  | "select"
  | "url"
  | "image"
  | "markdown";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  help?: string;
};

export type CollectionKey = "work" | "writing" | "teaching";

const SLUG: Field = {
  name: "slug",
  label: "Slug",
  type: "text",
  required: true,
  help: "URL segment, e.g. my-project. Lowercase, hyphens, no spaces.",
};

const BODY: Field = {
  name: "body",
  label: "Body",
  type: "markdown",
  help: "Markdown / MDX. Rendered as the page content.",
};

export const COLLECTION_FIELDS: Record<CollectionKey, Field[]> = {
  work: [
    SLUG,
    { name: "title", label: "Title", type: "text", required: true },
    { name: "client", label: "Client", type: "text", required: true },
    { name: "year", label: "Year", type: "number", required: true },
    { name: "role", label: "Role", type: "text", required: true },
    { name: "stack", label: "Stack", type: "list", help: "Comma or newline separated." },
    { name: "type", label: "Type", type: "select", options: WORK_TYPES, required: true },
    { name: "summary", label: "Summary", type: "textarea", required: true },
    { name: "cover", label: "Cover image", type: "image" },
    { name: "live_url", label: "Live URL", type: "url" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["live", "internal", "archived"],
      required: true,
    },
    { name: "date", label: "Date", type: "date", required: true },
    BODY,
  ],
  writing: [
    SLUG,
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "tags", label: "Tags", type: "list", help: "Comma or newline separated." },
    BODY,
  ],
  teaching: [
    SLUG,
    { name: "title", label: "Title", type: "text", required: true },
    { name: "week", label: "Week", type: "number", required: true },
    { name: "summary", label: "Summary", type: "textarea", required: true },
    { name: "subjects", label: "Subjects", type: "list", required: true },
    { name: "prerequisites", label: "Builds on", type: "list" },
    { name: "date", label: "Date", type: "date", required: true },
    BODY,
  ],
};

// The /now page is a single row with its own shape.
export const NOW_FIELDS: Field[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "updated", label: "Updated", type: "date", required: true },
  { name: "focus", label: "Focus", type: "textarea", required: true },
  { name: "reading", label: "Reading", type: "text", required: true },
  { name: "listening", label: "Listening", type: "text" },
  { name: "not_doing", label: "Not doing", type: "textarea" },
  { name: "thinking", label: "Thinking about", type: "list" },
  BODY,
];

export const COLLECTION_LABEL: Record<CollectionKey, string> = {
  work: "Work",
  writing: "Writing",
  teaching: "Teaching",
};

export const COLLECTION_KEYS: CollectionKey[] = ["work", "writing", "teaching"];

export function isCollectionKey(v: string): v is CollectionKey {
  return (COLLECTION_KEYS as string[]).includes(v);
}

/** Split a comma/newline separated input into a clean string array. */
export function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Columns that are text[] in the DB, so the action knows to split them. */
export const LIST_FIELDS = new Set([
  "stack",
  "tags",
  "subjects",
  "prerequisites",
  "thinking",
]);

/** Columns that are integers in the DB. */
export const NUMBER_FIELDS = new Set(["year", "week"]);
