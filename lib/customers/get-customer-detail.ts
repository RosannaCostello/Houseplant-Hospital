import type { PlantStatus } from "@/lib/plant-status";
import { PLANT_STATUSES } from "@/lib/plant-status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerDetailPlant = {
  id: string;
  name: string | null;
  species: string | null;
  size: string;
  status: PlantStatus;
  bugsFound: boolean | null;
};

export type CustomerDetailVisit = {
  id: string;
  checkinDate: string;
  notes: string | null;
  plants: CustomerDetailPlant[];
};

export type CustomerDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  marketingConsent: boolean;
  visits: CustomerDetailVisit[];
};

function isPlantStatus(value: string): value is PlantStatus {
  return (PLANT_STATUSES as readonly string[]).includes(value);
}

export async function getCustomerDetail(customerId: string): Promise<CustomerDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      phone,
      marketing_consent,
      visits (
        id,
        checkin_date,
        notes,
        plants (
          id,
          name,
          species,
          size,
          status,
          bugs_found,
          created_at
        )
      )
    `,
    )
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load customer: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string | null;
    marketing_consent?: boolean;
    visits?:
      | Array<{
          id: string;
          checkin_date: string;
          notes: string | null;
          plants: Array<{
            id: string;
            name: string | null;
            species: string | null;
            size: string;
            status: string;
            bugs_found: boolean | null;
            created_at: string;
          }> | null;
        }>
      | null;
  };

  if (!row.id || !row.first_name || !row.last_name || !row.email || row.marketing_consent == null) {
    return null;
  }

  const visits: CustomerDetailVisit[] = [...(row.visits ?? [])]
    .sort((a, b) => new Date(b.checkin_date).getTime() - new Date(a.checkin_date).getTime())
    .map((visit) => {
      const plants: CustomerDetailPlant[] = [...(visit.plants ?? [])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .flatMap((plant) => {
          if (!isPlantStatus(plant.status)) return [];

          return [
            {
              id: plant.id,
              name: plant.name,
              species: plant.species,
              size: plant.size,
              status: plant.status,
              bugsFound: plant.bugs_found ?? null,
            },
          ];
        });

      return {
        id: visit.id,
        checkinDate: visit.checkin_date,
        notes: visit.notes,
        plants,
      };
    });

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? null,
    marketingConsent: row.marketing_consent,
    visits,
  };
}
