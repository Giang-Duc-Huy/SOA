import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const PatientCreatedPayloadSchema = z.object({
  patientId: z.string().uuid(),
  mrn: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export const PatientUpdatedPayloadSchema = PatientCreatedPayloadSchema.partial().extend({
  patientId: z.string().uuid(),
});

export const PatientCreatedEventSchema = createEventEnvelope(PatientCreatedPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.PATIENT_CREATED),
  aggregateType: z.literal("Patient"),
});

export const PatientUpdatedEventSchema = createEventEnvelope(PatientUpdatedPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.PATIENT_UPDATED),
  aggregateType: z.literal("Patient"),
});

export type PatientCreatedPayload = z.infer<typeof PatientCreatedPayloadSchema>;
export type PatientUpdatedPayload = z.infer<typeof PatientUpdatedPayloadSchema>;
