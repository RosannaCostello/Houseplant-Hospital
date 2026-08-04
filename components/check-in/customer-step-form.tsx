"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createCheckInDraft,
  deleteCheckInDraft,
  updateCheckInDraftCustomer,
} from "@/app/actions/check-in-draft";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
import { CheckInStepShell } from "@/components/check-in/check-in-step-shell";
import { CustomerEmailField } from "@/components/check-in/customer-email-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  checkInCustomerSchema,
  type CheckInCustomer,
  type CheckInCustomerInput,
} from "@/lib/check-in/customer-schema";
import type { CustomerSearchResult } from "@/lib/customers/search-customers";
import { cn } from "@/lib/utils";

import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";

const defaultValues: CheckInCustomerInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  marketingConsent: true,
};

function toFormValues(customer: CheckInCustomer): CheckInCustomerInput {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    marketingConsent: customer.marketingConsent,
  };
}

type CustomerStepFormProps = {
  draftId?: string;
  initialCustomer?: CheckInCustomer;
};

export function CustomerStepForm({ draftId, initialCustomer }: CustomerStepFormProps) {
  const router = useRouter();
  const [editedValues, setEditedValues] = useState<CheckInCustomerInput | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CheckInCustomerInput, string>>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const formValues = editedValues ?? (initialCustomer ? toFormValues(initialCustomer) : defaultValues);

  function updateField<K extends keyof CheckInCustomerInput>(key: K, value: CheckInCustomerInput[K]) {
    setEditedValues((current) => ({ ...(current ?? formValues), [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormError(null);
  }

  function applyCustomerMatch(customer: CustomerSearchResult) {
    setEditedValues((current) => ({
      ...(current ?? formValues),
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone ?? "",
    }));
    setFieldErrors((current) => ({
      ...current,
      email: undefined,
      firstName: undefined,
      lastName: undefined,
      phone: undefined,
    }));
    setFormError(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = checkInCustomerSchema.safeParse(formValues);

    if (!parsed.success) {
      const errors: Partial<Record<keyof CheckInCustomerInput, string>> = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (typeof field === "string" && !errors[field as keyof CheckInCustomerInput]) {
          errors[field as keyof CheckInCustomerInput] = issue.message;
        }
      }

      setFieldErrors(errors);
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const result = draftId
      ? await updateCheckInDraftCustomer(draftId, parsed.data)
      : await createCheckInDraft(parsed.data);

    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    const nextDraftId = draftId ?? ("draftId" in result ? result.draftId : null);
    if (!nextDraftId) {
      setFormError("Could not save draft check-in.");
      return;
    }

    router.push(`/app/check-in/plants?draft=${nextDraftId}`);
  }

  async function runDiscard() {
    if (!draftId) {
      router.push("/app");
      return;
    }

    setSubmitting(true);
    const result = await deleteCheckInDraft(draftId);
    setSubmitting(false);
    setConfirmDiscard(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  function onDiscard() {
    if (!draftId) {
      router.push("/app");
      return;
    }
    setConfirmDiscard(true);
  }

  return (
    <CheckInStepShell
      header={
        <CheckInStepHeader
          step={1}
          totalSteps={3}
          title="Customer details"
        />
      }
      status={formError ? <p className="text-sm text-hilda-error-text">{formError}</p> : null}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {draftId ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={submitting}
              onClick={() => void onDiscard()}
            >
              Discard draft
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app">Cancel</Link>
            </Button>
          )}
          <Button
            type="submit"
            form="check-in-customer-form"
            className="w-full sm:w-auto"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Continue to plants"}
          </Button>
        </div>
      }
    >
      <form
        id="check-in-customer-form"
        className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        <CustomerEmailField
          value={formValues.email}
          error={fieldErrors.email}
          onChange={(email) => updateField("email", email)}
          onSelectCustomer={applyCustomerMatch}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={hildaLabelClassName}>
            First name
            <input
              className={cn(hildaInputClassName, "py-2.5")}
              type="text"
              name="firstName"
              autoComplete="given-name"
              enterKeyHint="next"
              value={formValues.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
            {fieldErrors.firstName ? (
              <span className="mt-1 block text-sm text-hilda-error-text">{fieldErrors.firstName}</span>
            ) : null}
          </label>

          <label className={hildaLabelClassName}>
            Last name
            <input
              className={cn(hildaInputClassName, "py-2.5")}
              type="text"
              name="lastName"
              autoComplete="family-name"
              enterKeyHint="next"
              value={formValues.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
            />
            {fieldErrors.lastName ? (
              <span className="mt-1 block text-sm text-hilda-error-text">{fieldErrors.lastName}</span>
            ) : null}
          </label>
        </div>

        <label className={hildaLabelClassName}>
          Phone <span className="font-normal text-hilda-text-muted">(optional)</span>
          <input
            className={cn(hildaInputClassName, "py-2.5")}
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            value={formValues.phone}
            onChange={(event) => updateField("phone", event.target.value)}
          />
          {fieldErrors.phone ? (
            <span className="mt-1 block text-sm text-hilda-error-text">{fieldErrors.phone}</span>
          ) : null}
        </label>

        <label className="flex items-start gap-2.5 rounded-hilda-sm border border-hilda-border/15 bg-hilda-bg p-3">
          <span className="relative mt-0.5 h-4 w-4 shrink-0">
            <input
              className="peer sr-only"
              type="checkbox"
              name="marketingConsent"
              checked={formValues.marketingConsent}
              onChange={(event) => updateField("marketingConsent", event.target.checked)}
            />
            <span
              aria-hidden
              className="block h-4 w-4 rounded-hilda-sm border border-hilda-border/30 bg-hilda-surface transition-colors peer-checked:border-hilda-gold peer-checked:bg-hilda-gold peer-focus-visible:ring-2 peer-focus-visible:ring-hilda-gold/40"
            />
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 text-hilda-heading peer-checked:block"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-xs leading-snug text-hilda-text sm:text-sm">
            <span className="font-medium text-hilda-heading">Marketing emails.</span> Customer agrees to
            offers, Hilda newsletter, and plant care tips. Hospital treatment updates are always sent
            regardless of this box.{" "}
            <span className="text-hilda-text">Deselect to opt out.</span>
          </span>
        </label>
      </form>
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard check-in?"
        message="Discard this incomplete check-in? This cannot be undone."
        confirmLabel="Discard"
        destructive
        pending={submitting}
        onConfirm={() => {
          void runDiscard();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </CheckInStepShell>
  );
}
