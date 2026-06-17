"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addTreatmentNoteAction } from "@/app/actions/add-treatment-note";
import { Button } from "@/components/ui/button";
import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
import type { PlantDetailTreatmentNote } from "@/lib/plants/get-plant-detail";

type TreatmentNotesSectionProps = {
  plantId: string;
  notes: PlantDetailTreatmentNote[];
};

function formatNoteTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TreatmentNotesSection({ plantId, notes }: TreatmentNotesSectionProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await addTreatmentNoteAction(plantId, content);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setContent("");
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Treatment notes</h2>
        <p className="mt-1 text-sm text-zinc-600">Surgery and treatment log for this plant.</p>
      </div>

      {notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-zinc-900">{note.content}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {note.authorName ?? "Staff"} · {formatNoteTimestamp(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          No treatment notes yet.
        </p>
      )}

      <form className="space-y-3 border-t border-zinc-100 pt-4" onSubmit={handleSubmit}>
        <label className={checkInLabelClassName}>
          Add note
          <textarea
            className={`${checkInInputClassName} min-h-[6rem] resize-y`}
            name="content"
            rows={3}
            placeholder="What treatment was done?"
            value={content}
            disabled={isPending}
            onChange={(event) => {
              setContent(event.target.value);
              setError(null);
            }}
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" disabled={isPending || !content.trim()}>
          {isPending ? "Saving…" : "Save note"}
        </Button>
      </form>
    </section>
  );
}
