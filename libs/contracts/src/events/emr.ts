import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const EmrEncounterCreatedPayloadSchema = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "ACTIVE"]),
  chiefComplaint: z.string().optional(),
});

export const EmrEncounterCompletedPayloadSchema = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  completedAt: z.string().datetime(),
  summary: z.string().optional(),
});

export const EmrEncounterCreatedEventSchema = createEventEnvelope(EmrEncounterCreatedPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.EMR_ENCOUNTER_CREATED),
  aggregateType: z.literal("Encounter"),
});

export const EmrEncounterCompletedEventSchema = createEventEnvelope(EmrEncounterCompletedPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.EMR_ENCOUNTER_COMPLETED),
  aggregateType: z.literal("Encounter"),
});
