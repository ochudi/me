import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TABLE } from "@/lib/supabase/env";
import type { CollectionKey } from "./fields";

export type Row = Record<string, unknown> & { id: string };

// Admin reads use the cookie-bound (authenticated) client, so row-level
// security returns ALL rows including drafts — unlike the public read path.

export async function adminList(collection: CollectionKey): Promise<Row[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from(TABLE[collection])
    .select("*")
    .order("date", { ascending: false });
  return (data ?? []) as Row[];
}

export async function adminGet(
  collection: CollectionKey,
  id: string,
): Promise<Row | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from(TABLE[collection])
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Row) ?? null;
}

export async function adminCounts(): Promise<Record<CollectionKey, number>> {
  const supabase = await createSupabaseServerClient();
  const keys: CollectionKey[] = ["work", "writing", "teaching"];
  const out = { work: 0, writing: 0, teaching: 0 } as Record<
    CollectionKey,
    number
  >;
  await Promise.all(
    keys.map(async (k) => {
      const { count } = await supabase
        .from(TABLE[k])
        .select("id", { count: "exact", head: true });
      out[k] = count ?? 0;
    }),
  );
  return out;
}

export async function adminGetNow(): Promise<Row | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from(TABLE.now)
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as Row) ?? null;
}
