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

export const PharmacyPrescriptionDispensedPayloadSchema = z.object({
  prescriptionId: z.string().uuid(),
  patientId: z.string().uuid(),
  dispensedAt: z.string().datetime(),
  items: z.array(
    z.object({
      medicineId: z.string().uuid(),
      medicineName: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
});

export const PharmacyStockLowPayloadSchema = z.object({
  medicineId: z.string().uuid(),
  medicineName: z.string(),
  stockQuantity: z.number().int(),
  lowStockThreshold: z.number().int(),
});

export const PharmacyPrescriptionIssuedEventSchema = createEventEnvelope(
  PharmacyPrescriptionIssuedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.PHARMACY_PRESCRIPTION_ISSUED),
  aggregateType: z.literal("Prescription"),
});

export const PharmacyPrescriptionDispensedEventSchema = createEventEnvelope(
  PharmacyPrescriptionDispensedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.PHARMACY_PRESCRIPTION_DISPENSED),
  aggregateType: z.literal("Prescription"),
});

export const PharmacyStockLowEventSchema = createEventEnvelope(PharmacyStockLowPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.PHARMACY_STOCK_LOW),
  aggregateType: z.literal("Inventory"),
});

export type PharmacyPrescriptionIssuedPayload = z.infer<typeof PharmacyPrescriptionIssuedPayloadSchema>;
export type PharmacyPrescriptionDispensedPayload = z.infer<typeof PharmacyPrescriptionDispensedPayloadSchema>;
export type PharmacyStockLowPayload = z.infer<typeof PharmacyStockLowPayloadSchema>;
