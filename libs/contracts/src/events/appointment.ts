import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const AppointmentBookedPayloadSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  department: z.string(),
  room: z.string().optional(),
  reason: z.string().optional(),
  status: z.literal("BOOKED"),
});

export const AppointmentCancelledPayloadSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  cancelledAt: z.string().datetime(),
  reason: z.string().optional(),
});

export const AppointmentCompletedPayloadSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  completedAt: z.string().datetime(),
  department: z.string(),
});

export const AppointmentBookedEventSchema = createEventEnvelope(AppointmentBookedPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.APPOINTMENT_BOOKED),
  aggregateType: z.literal("Appointment"),
});

export const AppointmentCancelledEventSchema = createEventEnvelope(AppointmentCancelledPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.APPOINTMENT_CANCELLED),
  aggregateType: z.literal("Appointment"),
});

export const AppointmentCompletedEventSchema = createEventEnvelope(AppointmentCompletedPayloadSchema).extend({
  eventType: z.literal(EVENT_TYPES.APPOINTMENT_COMPLETED),
  aggregateType: z.literal("Appointment"),
});

export type AppointmentBookedPayload = z.infer<typeof AppointmentBookedPayloadSchema>;
export type AppointmentCancelledPayload = z.infer<typeof AppointmentCancelledPayloadSchema>;
export type AppointmentCompletedPayload = z.infer<typeof AppointmentCompletedPayloadSchema>;
