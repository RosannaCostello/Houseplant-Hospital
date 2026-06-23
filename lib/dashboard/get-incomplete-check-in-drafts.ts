import type { IncompleteCheckInDraft } from "@/lib/check-in/check-in-draft-types";
import { signPhotoPaths } from "@/lib/photos/sign-photo-urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DraftListRow = {
  id: string;
  plants: unknown;
  draft_step: "plants" | "photos";
  updated_at: string;
  customers:
    | { first_name: string; last_name: string }
    | Array<{ first_name: string; last_name: string }>;
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function plantCount(plants: unknown): number {
  if (!Array.isArray(plants)) return 0;
  return plants.length;
}

export async function getIncompleteCheckInDrafts(): Promise<IncompleteCheckInDraft[]> {
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("check_in_drafts")
    .select(
      "id, plants, draft_step, updated_at, customers ( first_name, last_name )",
    )
    .order("updated_at", { ascending: false });

  if (error || !rows) {
    return [];
  }

  const draftIds = rows.map((row) => row.id);

  const { data: photoRows } =
    draftIds.length > 0
      ? await supabase
          .from("check_in_draft_photos")
          .select("draft_id, thumbnail_path, created_at")
          .in("draft_id", draftIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const firstThumbByDraft = new Map<string, string>();
  for (const photo of photoRows ?? []) {
    if (!firstThumbByDraft.has(photo.draft_id)) {
      firstThumbByDraft.set(photo.draft_id, photo.thumbnail_path);
    }
  }

  const thumbPaths = [...firstThumbByDraft.values()];
  const signed = await signPhotoPaths(thumbPaths, supabase);

  return (rows as DraftListRow[])
    .map((row) => {
      const customer = unwrapRelation(row.customers);
      if (!customer) return null;

      const thumbPath = firstThumbByDraft.get(row.id);

      return {
        id: row.id,
        customerName: `${customer.first_name} ${customer.last_name}`.trim(),
        draftStep: row.draft_step,
        plantCount: plantCount(row.plants),
        updatedAt: row.updated_at,
        thumbnailUrl: thumbPath ? (signed.get(thumbPath) ?? null) : null,
      };
    })
    .filter((draft): draft is IncompleteCheckInDraft => draft !== null);
}
