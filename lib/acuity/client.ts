import "server-only";

import { getAcuityConfig } from "@/lib/acuity/env";

export type AcuityAppointment = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  canceled: boolean;
};

export async function fetchAcuityAppointment(
  appointmentId: number,
): Promise<{ success: true; appointment: AcuityAppointment } | { success: false; error: string }> {
  const config = getAcuityConfig();
  if (!config) {
    return { success: false, error: "Acuity is not configured." };
  }

  const auth = Buffer.from(`${config.userId}:${config.apiKey}`).toString("base64");
  const response = await fetch(
    `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      success: false,
      error: `Acuity appointment fetch failed (${response.status}).`,
    };
  }

  const json = (await response.json()) as {
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    canceled?: boolean;
  };

  if (!json.id || !json.email?.trim()) {
    return { success: false, error: "Acuity appointment is missing an email." };
  }

  return {
    success: true,
    appointment: {
      id: json.id,
      firstName: (json.firstName ?? "").trim() || "Guest",
      lastName: (json.lastName ?? "").trim() || "Customer",
      email: json.email.trim(),
      phone: (json.phone ?? "").trim(),
      canceled: Boolean(json.canceled),
    },
  };
}
