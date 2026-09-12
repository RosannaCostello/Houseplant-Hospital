import { z } from "zod";

export const checkInCustomerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Phone number is required"),
  marketingConsent: z.boolean(),
});

export type CheckInCustomerInput = z.input<typeof checkInCustomerSchema>;
export type CheckInCustomer = z.output<typeof checkInCustomerSchema>;
