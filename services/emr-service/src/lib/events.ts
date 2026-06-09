import { randomUUID } from "crypto";
import {
  EmrEncounterCreatedEventSchema,
  EmrEncounterCompletedEventSchema,
  EVENT_TYPES,
  KAFKA_TOPICS,
} from "@hm/contracts";
import { createOutboxEntry } from "@hm/messaging";

type Encounter = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  doctorId: string | null;
  status: string;
  chiefComplaint: string | null;
  completedAt: Date | null;
  summary: string | null;
};

export function buildEncounterCreatedOutbox(encounter: Encounter) {
  const event = EmrEncounterCreatedEventSchema.parse({
    eventId: randomUUID(),
    eventType: EVENT_TYPES.EMR_ENCOUNTER_CREATED,
    aggregateId: encounter.id,
    aggregateType: "Encounter",
    occurredAt: new Date().toISOString(),
    version: 1,
    payload: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      appointmentId: encounter.appointmentId ?? undefined,
      doctorId: encounter.doctorId ?? undefined,
      status: encounter.status as "DRAFT" | "ACTIVE",
      chiefComplaint: encounter.chiefComplaint ?? undefined,
    },
  });

  return createOutboxEntry({
    aggregateType: "Encounter",
    aggregateId: encounter.id,
    eventType: EVENT_TYPES.EMR_ENCOUNTER_CREATED,
    topic: KAFKA_TOPICS.EMR,
    payload: event,
  });
}

export function buildEncounterCompletedOutbox(encounter: Encounter) {
  const event = EmrEncounterCompletedEventSchema.parse({
    eventId: randomUUID(),
    eventType: EVENT_TYPES.EMR_ENCOUNTER_COMPLETED,
    aggregateId: encounter.id,
    aggregateType: "Encounter",
    occurredAt: new Date().toISOString(),
    version: 1,
    payload: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      completedAt: (encounter.completedAt ?? new Date()).toISOString(),
      summary: encounter.summary ?? undefined,
    },
  });

  return createOutboxEntry({
    aggregateType: "Encounter",
    aggregateId: encounter.id,
    eventType: EVENT_TYPES.EMR_ENCOUNTER_COMPLETED,
    topic: KAFKA_TOPICS.EMR,
    payload: event,
  });
}
