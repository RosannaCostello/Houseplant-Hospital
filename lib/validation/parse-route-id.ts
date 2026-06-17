import { z } from "zod";

const routeIdSchema = z.string().uuid();

export function isValidRouteId(id: string): boolean {
  return routeIdSchema.safeParse(id).success;
}
