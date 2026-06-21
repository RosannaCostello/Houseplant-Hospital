import { escapeIlike } from "@/lib/customers/escape-ilike";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

function buildSearchFilter(query: string): string | null {
  const trimmed = query.trim();

  if (!trimmed) return null;

  const pattern = `%${escapeIlike(trimmed)}%`;
  const parts = trimmed.split(/\s+/).filter(Boolean);

  const filters = [
    `first_name.ilike.${pattern}`,
    `last_name.ilike.${pattern}`,
    `email.ilike.${pattern}`,
    `phone.ilike.${pattern}`,
  ];

  if (parts.length >= 2) {
    const first = `%${escapeIlike(parts[0])}%`;
    const last = `%${escapeIlike(parts.slice(1).join(" "))}%`;
    filters.push(`and(first_name.ilike.${first},last_name.ilike.${last})`);
  }

  return filters.join(",");
}

const EMAIL_AUTOCOMPLETE_MIN_LENGTH = 4;
const EMAIL_AUTOCOMPLETE_LIMIT = 8;

export async function searchCustomersByEmail(emailQuery: string): Promise<CustomerSearchResult[]> {
  const trimmed = emailQuery.trim();

  if (trimmed.length < EMAIL_AUTOCOMPLETE_MIN_LENGTH) {
    return [];
  }

  const pattern = `${escapeIlike(trimmed)}%`;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone")
    .ilike("email", pattern)
    .order("email", { ascending: true })
    .limit(EMAIL_AUTOCOMPLETE_LIMIT);

  if (error) {
    throw new Error(`Failed to search customers by email: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
  }));
}

export async function searchCustomers(query: string): Promise<CustomerSearchResult[]> {
  const filter = buildSearchFilter(query);

  if (!filter) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone")
    .or(filter)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .limit(25);

  if (error) {
    throw new Error(`Failed to search customers: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
  }));
}
