"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckInStepHeader } from "@/components/check-in/check-in-step-header";
import { Button } from "@/components/ui/button";
import {
  checkInCustomerSchema,
  type CheckInCustomer,
  type CheckInCustomerInput,
} from "@/lib/check-in/customer-schema";
import { saveCheckInDraft, loadCheckInDraft } from "@/lib/check-in/draft";
import { useCheckInDraft } from "@/lib/check-in/use-check-in-draft";

import { checkInInputClassName, checkInLabelClassName } from "@/lib/check-in/form-styles";
const defaultValues: CheckInCustomerInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  marketingConsent: false,
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
    <div className="mx-auto w-full max-w-2xl">
      <CheckInStepHeader
        step={1}
        totalSteps={3}
        title="Customer details"
        description="Capture who dropped the plants off. Staff complete plant details on the next step."
      />

      <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
        <div className="grid gap-6 sm:grid-cols-2">
          <label className={checkInLabelClassName}>
            First name
            <input
              className={checkInInputClassName}
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
              className={checkInInputClassName}
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
          Email
          <input
            className={checkInInputClassName}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="next"
            value={formValues.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
          {fieldErrors.email ? (
            <span className="mt-1 block text-sm text-red-600">{fieldErrors.email}</span>
          ) : null}
        </label>

        <label className={checkInLabelClassName}>
          Phone <span className="font-normal text-zinc-500">(optional)</span>
          <input
            className={checkInInputClassName}
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

        <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <input
            className="mt-1 h-5 w-5 rounded border-zinc-300"
            type="checkbox"
            name="marketingConsent"
            checked={formValues.marketingConsent}
            onChange={(event) => updateField("marketingConsent", event.target.checked)}
          />
          <span className="text-sm leading-6 text-zinc-700">
            Customer agrees to receive marketing emails from Hilda (newsletter, offers, and plant care
            tips). Transactional Hospital updates are always sent regardless.
          </span>
        </label>

        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/app">Cancel</Link>
          </Button>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Continue to plants
          </Button>
        </div>
      </form>
    </div>
  );
}
