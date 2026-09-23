"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveSurgerySignOffAction } from "@/app/actions/save-surgery-sign-off";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { HospitalStaff } from "@/lib/staff/types";
import { formatStaffInitials, formatStaffName } from "@/lib/staff/types";

type SurgerySignOffFieldProps = {
  plantId: string;
  staffOptions: HospitalStaff[];
  initialStaff: HospitalStaff | null;
  readOnly?: boolean;
};

export function SurgerySignOffField({
  plantId,
  staffOptions,
  initialStaff,
  readOnly = false,
}: SurgerySignOffFieldProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialStaff?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedId(initialStaff?.id ?? "");
  }, [initialStaff?.id]);

  function onChange(nextId: string) {
    setSelectedId(nextId);
    setError(null);

    if (readOnly) return;

    startTransition(async () => {
      const result = await saveSurgerySignOffAction({
        plantId,
        staffId: nextId || null,
      });

      if (!result.success) {
        setError(result.error);
        setSelectedId(initialStaff?.id ?? "");
        return;
      }

      router.refresh();
    });
  }

  if (readOnly) {
    if (!initialStaff) return null;

    return (
      <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-hilda-text-muted">
          Surgery completed by
        </h2>
        <p className="mt-1 text-sm font-medium text-hilda-heading">
          {formatStaffInitials(initialStaff)}{" "}
          <span className="font-normal text-hilda-text">({formatStaffName(initialStaff)})</span>
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-hilda border border-hilda-border/15 bg-hilda-surface p-3">
      <label className={hildaLabelClassName}>
        Surgery was completed on this plant by
        <select
          className={`${hildaInputClassName} py-2.5`}
          value={selectedId}
          disabled={isPending || staffOptions.length === 0}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select staff member…</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {formatStaffName(staff)} ({formatStaffInitials(staff)})
            </option>
          ))}
        </select>
      </label>
      {staffOptions.length === 0 ? (
        <p className="mt-2 text-sm text-hilda-error-text">
          No staff configured. An admin can add staff in Settings.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-hilda-error-text">{error}</p> : null}
      {isPending ? <p className="mt-2 text-xs text-hilda-text-muted">Saving…</p> : null}
    </section>
  );
}
