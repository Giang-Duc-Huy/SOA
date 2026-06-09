import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const LabOrderRequestedPayloadSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  type: z.enum(["LAB", "RADIOLOGY"]),
  testName: z.string(),
  requestedAt: z.string().datetime().optional(),
});

export const LabOrderCreatedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional(),
  orderedBy: z.string().uuid(),
  testType: z.string(),
  priority: z.enum(["ROUTINE", "URGENT", "STAT"]).default("ROUTINE"),
});

export const LabResultReadyPayloadSchema = z.object({
  orderId: z.string().uuid(),
  patientId: z.string().uuid(),
  resultSummary: z.string(),
  completedAt: z.string().datetime(),
  isAbnormal: z.boolean().default(false),
});

export const LabOrderRequestedEventSchema = createEventEnvelope(LabOrderRequestedPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.LAB_ORDER_REQUESTED),
  aggregateType: z.literal("LabOrder"),
});

export const LabOrderCreatedEventSchema = createEventEnvelope(LabOrderCreatedPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.LAB_ORDER_CREATED),
  aggregateType: z.literal("LabOrder"),
});

export const LabResultReadyEventSchema = createEventEnvelope(LabResultReadyPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.LAB_RESULT_READY),
  aggregateType: z.literal("LabOrder"),
});

export type LabOrderRequestedPayload = z.infer<typeof LabOrderRequestedPayloadSchema>;
export type LabOrderCreatedPayload = z.infer<typeof LabOrderCreatedPayloadSchema>;
export type LabResultReadyPayload = z.infer<typeof LabResultReadyPayloadSchema>;
