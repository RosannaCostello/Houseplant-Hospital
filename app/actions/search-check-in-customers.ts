"use server";

import { searchCustomersByEmail } from "@/lib/customers/search-customers";

export async function searchCheckInCustomersByEmail(email: string) {
  return searchCustomersByEmail(email);
}
