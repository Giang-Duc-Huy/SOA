import { z } from "zod";

export const CreateInvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().positive(),
});

export const CreateInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).default("ISSUED"),
  items: z.array(CreateInvoiceItemSchema).min(1),
});

export const PayInvoiceSchema = z.object({
  method: z.string().min(1),
  amount: z.number().positive().optional(),
});
