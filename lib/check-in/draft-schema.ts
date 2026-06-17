import { z } from "zod";
import { checkInCustomerSchema } from "@/lib/check-in/customer-schema";
import { checkInPlantSchema } from "@/lib/check-in/plant-schema";

export const checkInPlantPhotoSchema = z.object({
  plantClientId: z.string().min(1),
  mimeType: z.enum(["image/webp", "image/jpeg"]),
  dataUrl: z.string().startsWith("data:"),
  byteSize: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  thumbnailDataUrl: z.string().startsWith("data:"),
  thumbnailByteSize: z.number().nonnegative(),
});

export const checkInDraftSchema = z.object({
  customer: checkInCustomerSchema,
  plants: z.array(checkInPlantSchema).optional(),
  photos: z.array(checkInPlantPhotoSchema).optional(),
});

export type CheckInDraft = z.infer<typeof checkInDraftSchema>;
