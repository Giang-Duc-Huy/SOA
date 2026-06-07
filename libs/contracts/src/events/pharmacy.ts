import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const PharmacyPrescriptionIssuedPayloadSchema = z.object({
  prescriptionId: z.string().uuid(),
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  issuedBy: z.string().uuid(),
  medications: z.array(
    z.object({
      drugCode: z.string(),
      drugName: z.string(),
      quantity: z.number().int().positive(),
      dosage: z.string(),
    })
  ),
});

export const PharmacyStockLowPayloadSchema = z.object({
  drugCode: z.string(),
  drugName: z.string(),
  currentStock: z.number().int(),
  reorderLevel: z.number().int(),
  warehouseId: z.string().uuid().optional(),
});

export const PharmacyPrescriptionIssuedEventSchema = createEventEnvelope(
  PharmacyPrescriptionIssuedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.PHARMACY_PRESCRIPTION_ISSUED),
  aggregateType: z.literal("Prescription"),
});

export const PharmacyStockLowEventSchema = createEventEnvelope(PharmacyStockLowPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.PHARMACY_STOCK_LOW),
  aggregateType: z.literal("Inventory"),
});
