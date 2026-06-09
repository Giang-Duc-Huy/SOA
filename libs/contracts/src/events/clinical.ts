import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const ClinicalServiceCompletedPayloadSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  serviceName: z.string(),
  serviceFee: z.number().positive(),
  completedAt: z.string().datetime(),
});

export const ClinicalPrescriptionIssuedPayloadSchema = z.object({
  prescriptionId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  items: z.array(
    z.object({
      medicineName: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  issuedAt: z.string().datetime().optional(),
});

export const ClinicalLabOrderRequestedPayloadSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  type: z.enum(["LAB", "RADIOLOGY"]),
  testName: z.string(),
  requestedAt: z.string().datetime().optional(),
});

export const ClinicalServiceCompletedEventSchema = createEventEnvelope(
  ClinicalServiceCompletedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.CLINICAL_SERVICE_COMPLETED),
  aggregateType: z.literal("ClinicalService"),
});

export const ClinicalPrescriptionIssuedEventSchema = createEventEnvelope(
  ClinicalPrescriptionIssuedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.CLINICAL_PRESCRIPTION_ISSUED),
  aggregateType: z.literal("Prescription"),
});

export const ClinicalLabOrderRequestedEventSchema = createEventEnvelope(
  ClinicalLabOrderRequestedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.CLINICAL_LAB_ORDER_REQUESTED),
  aggregateType: z.literal("LabOrder"),
});

export type ClinicalServiceCompletedPayload = z.infer<typeof ClinicalServiceCompletedPayloadSchema>;
export type ClinicalPrescriptionIssuedPayload = z.infer<typeof ClinicalPrescriptionIssuedPayloadSchema>;
export type ClinicalLabOrderRequestedPayload = z.infer<typeof ClinicalLabOrderRequestedPayloadSchema>;
