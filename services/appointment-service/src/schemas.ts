import { z } from "zod";

export const BookAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  patientName: z.string().optional(),
  doctorId: z.string().uuid(),
  doctorName: z.string().optional(),
  scheduledAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  department: z.string().min(1),
  room: z.string().optional(),
  reason: z.string().optional(),
  appointmentType: z.string().optional(),
  specialty: z.string().optional(),
});

export const CancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export const ListAppointmentsSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(["BOOKED", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  specialty: z.string().optional(),
});
