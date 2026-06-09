import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const BillingInvoiceCreatedPayloadSchema = z.object({
  invoiceId: z.string().uuid(),
  patientId: z.string().uuid(),
  sourceType: z.enum(["APPOINTMENT", "CLINICAL", "PHARMACY", "LAB"]),
  sourceId: z.string().uuid(),
  totalAmount: z.number().positive(),
  currency: z.string().default("VND"),
  status: z.enum(["DRAFT", "PENDING", "PAID"]).default("DRAFT"),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().positive(),
      })
    )
    .optional(),
});

export const BillingInvoicePaidPayloadSchema = z.object({
  invoiceId: z.string().uuid(),
  patientId: z.string().uuid(),
  paidAmount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "CARD", "INSURANCE", "TRANSFER"]),
  paidAt: z.string().datetime(),
});

export const BillingInvoiceCreatedEventSchema = createEventEnvelope(
  BillingInvoiceCreatedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.BILLING_INVOICE_CREATED),
  aggregateType: z.literal("Invoice"),
});

export const BillingInvoicePaidEventSchema = createEventEnvelope(BillingInvoicePaidPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.BILLING_INVOICE_PAID),
  aggregateType: z.literal("Invoice"),
});

export type BillingInvoiceCreatedPayload = z.infer<typeof BillingInvoiceCreatedPayloadSchema>;
export type BillingInvoicePaidPayload = z.infer<typeof BillingInvoicePaidPayloadSchema>;
