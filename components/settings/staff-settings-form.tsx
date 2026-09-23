"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createHospitalStaffAction,
  deactivateHospitalStaffAction,
  updateHospitalStaffAction,
} from "@/app/actions/staff-settings";
import { Button } from "@/components/ui/button";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import type { HospitalStaff } from "@/lib/staff/types";
import { formatStaffInitials } from "@/lib/staff/types";

type StaffSettingsFormProps = {
  staff: HospitalStaff[];
};

function draftsFromStaff(staff: HospitalStaff[]): Record<string, { firstName: string; lastName: string }> {
  const initial: Record<string, { firstName: string; lastName: string }> = {};
  for (const member of staff) {
    initial[member.id] = { firstName: member.firstName, lastName: member.lastName };
  }
  return initial;
}

export function StaffSettingsForm({ staff }: StaffSettingsFormProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(() => draftsFromStaff(staff));
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDrafts(draftsFromStaff(staff));
  }, [staff]);

  const activeStaff = staff.filter((member) => member.active);
  const inactiveStaff = staff.filter((member) => !member.active);

  function refreshAfter(successMessage: string) {
    setMessage(successMessage);
    setError(null);
    router.refresh();
  }

  function handleAdd() {
    startTransition(async () => {
      const result = await createHospitalStaffAction({
        firstName: newFirstName,
        lastName: newLastName,
      });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setNewFirstName("");
      setNewLastName("");
      refreshAfter("Staff member added.");
    });
  }

  function handleUpdate(id: string) {
    const draft = drafts[id];
    if (!draft) return;

    startTransition(async () => {
      const result = await updateHospitalStaffAction({
        id,
        firstName: draft.firstName,
        lastName: draft.lastName,
      });
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Staff member updated.");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await deactivateHospitalStaffAction(id);
      if (!result.success) {
        setError(result.error);
        setMessage(null);
        return;
      }
      refreshAfter("Staff member removed from the list.");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-hilda-heading">Staff</h2>
        <p className="mt-1 text-sm text-hilda-text-muted">
          Staff appear in the surgery sign-off dropdown on plants in Surgery. Initials show on
          Outpatient and Collected cards.
        </p>
      </div>

      <ul className="space-y-3">
        {activeStaff.map((member) => (
          <li
            key={member.id}
            className="grid gap-3 rounded-hilda-sm border border-hilda-border/15 p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <label className={hildaLabelClassName}>
              First name
              <input
                className={hildaInputClassName}
                value={drafts[member.id]?.firstName ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [member.id]: {
                      ...current[member.id],
                      firstName: event.target.value,
                      lastName: current[member.id]?.lastName ?? member.lastName,
                    },
                  }))
                }
              />
            </label>
            <label className={hildaLabelClassName}>
              Surname
              <input
                className={hildaInputClassName}
                value={drafts[member.id]?.lastName ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [member.id]: {
                      firstName: current[member.id]?.firstName ?? member.firstName,
                      lastName: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <p className="self-end pb-3 text-sm text-hilda-text-muted">
              Initials: {formatStaffInitials(member)}
            </p>
            <div className="flex flex-wrap gap-2 self-end">
              <Button type="button" variant="outline" disabled={isPending} onClick={() => handleUpdate(member.id)}>
                Save
              </Button>
              <Button type="button" variant="ghost" disabled={isPending} onClick={() => handleRemove(member.id)}>
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {inactiveStaff.length > 0 ? (
        <p className="text-sm text-hilda-text-muted">
          {inactiveStaff.length} inactive staff member{inactiveStaff.length === 1 ? "" : "s"} hidden
          from surgery sign-off.
        </p>
      ) : null}

      <div className="grid gap-3 rounded-hilda-sm border border-dashed border-hilda-border/25 p-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className={hildaLabelClassName}>
          First name
          <input
            className={hildaInputClassName}
            value={newFirstName}
            onChange={(event) => setNewFirstName(event.target.value)}
            placeholder="e.g. Rosanna"
          />
        </label>
        <label className={hildaLabelClassName}>
          Surname
          <input
            className={hildaInputClassName}
            value={newLastName}
            onChange={(event) => setNewLastName(event.target.value)}
            placeholder="e.g. Smith"
          />
        </label>
        <div className="self-end">
          <Button type="button" disabled={isPending} onClick={handleAdd}>
            Add staff
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-hilda-error-text">{error}</p> : null}
      {message ? <p className="text-sm text-hilda-text">{message}</p> : null}
    </div>
  );
}
