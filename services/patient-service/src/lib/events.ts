import { randomUUID } from "crypto";
import {
  PatientCreatedEventSchema,
  PatientUpdatedEventSchema,
  EVENT_TYPES,
  KAFKA_TOPICS,
  type PatientCreatedPayload,
  type PatientUpdatedPayload,
} from "@hm/contracts";
import { createOutboxEntry } from "@hm/messaging";

export function patientToPayload(patient: {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}): PatientCreatedPayload {
  return {
    patientId: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth.toISOString().split("T")[0],
    gender: patient.gender as PatientCreatedPayload["gender"],
    phone: patient.phone ?? undefined,
    email: patient.email ?? undefined,
    address: patient.address ?? undefined,
  };
}

export function buildPatientCreatedOutbox(patient: Parameters<typeof patientToPayload>[0]) {
  const payload = patientToPayload(patient);
  const event = PatientCreatedEventSchema.parse({
    eventId: randomUUID(),
    eventType: EVENT_TYPES.PATIENT_CREATED,
    aggregateId: patient.id,
    aggregateType: "Patient",
    occurredAt: new Date().toISOString(),
    version: 1,
    payload,
  });

  return createOutboxEntry({
    aggregateType: "Patient",
    aggregateId: patient.id,
    eventType: EVENT_TYPES.PATIENT_CREATED,
    topic: KAFKA_TOPICS.PATIENT,
    payload: event,
  });
}

export function buildPatientUpdatedOutbox(
  patient: Parameters<typeof patientToPayload>[0],
  changes: Partial<PatientUpdatedPayload>
) {
  const event = PatientUpdatedEventSchema.parse({
    eventId: randomUUID(),
    eventType: EVENT_TYPES.PATIENT_UPDATED,
    aggregateId: patient.id,
    aggregateType: "Patient",
    occurredAt: new Date().toISOString(),
    version: 1,
    payload: { patientId: patient.id, ...changes },
  });

  return createOutboxEntry({
    aggregateType: "Patient",
    aggregateId: patient.id,
    eventType: EVENT_TYPES.PATIENT_UPDATED,
    topic: KAFKA_TOPICS.PATIENT,
    payload: event,
  });
}
