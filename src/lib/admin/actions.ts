"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/supabase/session";
import { MEDIA_BUCKET, TABLE } from "@/lib/supabase/env";
import {
  COLLECTION_FIELDS,
  NOW_FIELDS,
  LIST_FIELDS,
  NUMBER_FIELDS,
  isCollectionKey,
  splitList,
  type CollectionKey,
  type Field,
} from "./fields";

// Every action begins here. No admin session → straight to login. RLS in the
// database is the second line of defence, so even a forged call cannot write.
async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createSupabaseServerClient();
}

function parseScalars(fields: Field[], formData: FormData) {
  const row: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === "image") continue; // handled after, with the file
    const raw = formData.get(f.name);
    const str = typeof raw === "string" ? raw : "";
    if (f.type === "boolean") {
      row[f.name] = raw === "on" || raw === "true";
    } else if (LIST_FIELDS.has(f.name)) {
      row[f.name] = splitList(str);
    } else if (NUMBER_FIELDS.has(f.name)) {
      const n = Number(str);
      // Empty number: omit so the column default or existing value stands,
      // rather than writing null into a NOT NULL column.
      if (str.trim() !== "" && Number.isFinite(n)) row[f.name] = n;
    } else {
      const t = str.trim();
      row[f.name] = t === "" ? null : t;
    }
  }
  return row;
}

async function uploadImageFields(
  supabase: SupabaseClient,
  fields: Field[],
  formData: FormData,
  slug: string,
  row: Record<string, unknown>,
  stamp: number,
) {
  for (const f of fields) {
    if (f.type !== "image") continue;
    const existing = formData.get(f.name);
    let url = typeof existing === "string" ? existing : "";
    const file = formData.get(`${f.name}__file`);
    if (file instanceof File && file.size > 0) {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${slug}/${f.name}-${stamp}.${ext}`;
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(`Image upload failed: ${error.message}`);
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      url = data.publicUrl;
    }
    row[f.name] = url;
  }
}

function refresh(collection?: string, slug?: string) {
  // A low-traffic site: revalidate broadly so edits show up everywhere at
  // once (layout palette included), plus the specific routes for immediacy.
  revalidatePath("/", "layout");
  if (collection) revalidatePath(`/${collection}`);
  if (collection && slug) revalidatePath(`/${collection}/${slug}`);
}

export async function saveEntry(
  collectionRaw: string,
  formData: FormData,
): Promise<void> {
  if (!isCollectionKey(collectionRaw)) throw new Error("Unknown collection.");
  const collection: CollectionKey = collectionRaw;
  const supabase = await requireAdmin();
  const fields = COLLECTION_FIELDS[collection];

  const id = String(formData.get("id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) throw new Error("A slug is required.");

  const stamp = Date.now();
  const row = parseScalars(fields, formData);
  row.published = formData.get("published") === "on";
  await uploadImageFields(supabase, fields, formData, slug, row, stamp);

  if (id && id !== "new") {
    const { error } = await supabase
      .from(TABLE[collection])
      .update(row)
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from(TABLE[collection]).insert(row);
    if (error) throw new Error(error.message);
  }

  refresh(collection, slug);
  redirect(`/admin/${collection}`);
}

export async function deleteEntry(
  collectionRaw: string,
  id: string,
): Promise<void> {
  if (!isCollectionKey(collectionRaw)) throw new Error("Unknown collection.");
  const collection: CollectionKey = collectionRaw;
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from(TABLE[collection])
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh(collection);
  redirect(`/admin/${collection}`);
}

export async function saveNow(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  const row = parseScalars(NOW_FIELDS, formData);
  row.id = 1;
  row.published = formData.get("published") === "on";
  const { error } = await supabase
    .from(TABLE.now)
    .upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
  refresh();
  revalidatePath("/now");
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
