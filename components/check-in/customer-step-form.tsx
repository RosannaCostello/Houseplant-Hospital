"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
import { CheckInStepShell } from "@/components/check-in/check-in-step-shell";
import { CustomerEmailField } from "@/components/check-in/customer-email-field";
import { Button } from "@/components/ui/button";
import {
  checkInCustomerSchema,
  type CheckInCustomer,
  type CheckInCustomerInput,
} from "@/lib/check-in/customer-schema";
import { saveCheckInDraft, loadCheckInDraft } from "@/lib/check-in/draft";
import { useCheckInDraft } from "@/lib/check-in/use-check-in-draft";
import type { CustomerSearchResult } from "@/lib/customers/search-customers";
import { cn } from "@/lib/utils";

import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
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

export function CustomerStepForm() {
  const router = useRouter();
  const draft = useCheckInDraft();
  const [editedValues, setEditedValues] = useState<CheckInCustomerInput | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CheckInCustomerInput, string>>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  const formValues =
    editedValues ?? (draft?.customer ? toFormValues(draft.customer) : defaultValues);

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

  function onSubmit(event: React.FormEvent) {
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

    const existing = loadCheckInDraft();
    saveCheckInDraft({
      customer: parsed.data,
      plants: existing?.plants,
      photos: existing?.photos,
    });
    router.push("/app/check-in/plants");
  }

  return (
    <CheckInStepShell
      header={
        <CheckInStepHeader
          step={1}
          totalSteps={3}
          title="Customer details"
          description="Who dropped the plants off?"
        />
      }
      status={formError ? <p className="text-sm text-red-600">{formError}</p> : null}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/app">Cancel</Link>
          </Button>
          <Button type="submit" form="check-in-customer-form" className="w-full sm:w-auto">
            Continue to plants
          </Button>
        </div>
      }
    >
      <form
        id="check-in-customer-form"
        className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        onSubmit={onSubmit}
        noValidate
      >
        <CustomerEmailField
          value={formValues.email}
          error={fieldErrors.email}
          onChange={(email) => updateField("email", email)}
          onSelectCustomer={applyCustomerMatch}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={checkInLabelClassName}>
            First name
            <input
              className={cn(checkInInputClassName, "py-2.5")}
              type="text"
              name="firstName"
              autoComplete="given-name"
              enterKeyHint="next"
              value={formValues.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
            {fieldErrors.firstName ? (
              <span className="mt-1 block text-sm text-red-600">{fieldErrors.firstName}</span>
            ) : null}
          </label>

          <label className={checkInLabelClassName}>
            Last name
            <input
              className={cn(checkInInputClassName, "py-2.5")}
              type="text"
              name="lastName"
              autoComplete="family-name"
              enterKeyHint="next"
              value={formValues.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
            />
            {fieldErrors.lastName ? (
              <span className="mt-1 block text-sm text-red-600">{fieldErrors.lastName}</span>
            ) : null}
          </label>
        </div>

        <label className={checkInLabelClassName}>
          Phone <span className="font-normal text-zinc-500">(optional)</span>
          <input
            className={cn(checkInInputClassName, "py-2.5")}
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            value={formValues.phone}
            onChange={(event) => updateField("phone", event.target.value)}
          />
          {fieldErrors.phone ? (
            <span className="mt-1 block text-sm text-red-600">{fieldErrors.phone}</span>
          ) : null}
        </label>

        <label className="flex items-start gap-2.5 rounded-none border border-zinc-200 bg-zinc-50 p-3">
          <input
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300"
            type="checkbox"
            name="marketingConsent"
            checked={formValues.marketingConsent}
            onChange={(event) => updateField("marketingConsent", event.target.checked)}
          />
          <span className="text-xs leading-snug text-zinc-700 sm:text-sm">
            <span className="font-medium text-zinc-900">Marketing emails (pre-selected).</span> Customer
            agrees to Hilda newsletter, offers, and plant care tips.{" "}
            <span className="text-zinc-600">Deselect if they opt out.</span> Hospital treatment updates
            are always sent regardless of this box.
          </span>
        </label>
      </form>
    </CheckInStepShell>
  );
}
