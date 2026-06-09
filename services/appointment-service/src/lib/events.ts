import { randomUUID } from "crypto";
import {
  AppointmentBookedEventSchema,
  AppointmentCancelledEventSchema,
  AppointmentCompletedEventSchema,
  EVENT_TYPES,
  KAFKA_TOPICS,
} from "@hm/contracts";
import { createOutboxEntry } from "@hm/messaging";

type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  department: string;
  room: string | null;
  reason: string | null;
  status: string;
  cancelledAt: Date | null;
  cancelReason: string | null;
  completedAt: Date | null;
};

export function buildAppointmentBookedOutbox(appointment: Appointment) {
  const event = AppointmentBookedEventSchema.parse({
    eventId: randomUUID(),
    eventType: EVENT_TYPES.APPOINTMENT_BOOKED,
    aggregateId: appointment.id,
    aggregateType: "Appointment",
    occurredAt: new Date().toISOString(),
    version: 1,
    payload: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      scheduledAt: appointment.scheduledAt.toISOString(),
      department: appointment.department,
      room: appointment.room ?? undefined,
      reason: appointment.reason ?? undefined,
      status: "BOOKED",
    },
  });

  return createOutboxEntry({
    aggregateType: "Appointment",
    aggregateId: appointment.id,
    eventType: EVENT_TYPES.APPOINTMENT_BOOKED,
    topic: KAFKA_TOPICS.APPOINTMENT,
    payload: event,
  });
}

export function buildAppointmentCancelledOutbox(appointment: Appointment) {
  const event = AppointmentCancelledEventSchema.parse({
    eventId: randomUUID(),
    eventType: EVENT_TYPES.APPOINTMENT_CANCELLED,
    aggregateId: appointment.id,
    aggregateType: "Appointment",
    occurredAt: new Date().toISOString(),
    version: 1,
    payload: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      cancelledAt: (appointment.cancelledAt ?? new Date()).toISOString(),
      reason: appointment.cancelReason ?? undefined,
    },
  });

  return createOutboxEntry({
    aggregateType: "Appointment",
    aggregateId: appointment.id,
    eventType: EVENT_TYPES.APPOINTMENT_CANCELLED,
    topic: KAFKA_TOPICS.APPOINTMENT,
    payload: event,
  });
}

export function buildAppointmentCompletedOutbox(appointment: Appointment) {
  const event = AppointmentCompletedEventSchema.parse({
    eventId: randomUUID(),
    eventType: EVENT_TYPES.APPOINTMENT_COMPLETED,
    aggregateId: appointment.id,
    aggregateType: "Appointment",
    occurredAt: new Date().toISOString(),
    version: 1,
    payload: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      completedAt: (appointment.completedAt ?? new Date()).toISOString(),
      department: appointment.department,
    },
  });

  return createOutboxEntry({
    aggregateType: "Appointment",
    aggregateId: appointment.id,
    eventType: EVENT_TYPES.APPOINTMENT_COMPLETED,
    topic: KAFKA_TOPICS.APPOINTMENT,
    payload: event,
  });
}
