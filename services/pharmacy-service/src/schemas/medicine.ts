import { z } from "zod";

export const CreateMedicineSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  stockQuantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().positive().default(10),
  price: z.number().positive(),
  expiredAt: z.string().datetime().optional(),
});

export const UpdateStockSchema = z.object({
  stockQuantity: z.number().int().nonnegative(),
});
