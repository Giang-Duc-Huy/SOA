import { Router } from "express";
import type { Prisma } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import {
  buildAppointmentBookedOutbox,
  buildAppointmentCancelledOutbox,
  buildAppointmentCompletedOutbox,
} from "../lib/events.js";
import {
  BookAppointmentSchema,
  CancelAppointmentSchema,
  ListAppointmentsSchema,
} from "../schemas.js";

const router = Router();

const ACTIVE_STATUSES = ["BOOKED", "CONFIRMED"];

function formatAppointment(a: {
  id: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  doctorName: string | null;
  scheduledAt: Date;
  endAt: Date | null;
  department: string;
  room: string | null;
  reason: string | null;
  appointmentType: string | null;
  specialty: string | null;
  status: string;
  cancelledAt: Date | null;
  cancelReason: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...a,
    scheduledAt: a.scheduledAt.toISOString(),
    endAt: a.endAt?.toISOString() ?? null,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
  };
}

router.get("/", async (req, res) => {
  const parsed = ListAppointmentsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { from, to, doctorId, patientId, status, specialty } = parsed.data;
  const where: Prisma.AppointmentWhereInput = {};

  if (from || to) {
    where.scheduledAt = {};
    if (from) where.scheduledAt.gte = new Date(from);
    if (to) where.scheduledAt.lte = new Date(to);
  }
  if (doctorId) where.doctorId = doctorId;
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  if (specialty) where.specialty = specialty;

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
  });

  res.json({ data: appointments.map(formatAppointment) });
});

router.get("/:id", async (req, res) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
  });
  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(formatAppointment(appointment));
});

router.post("/", async (req, res) => {
  const parsed = BookAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const scheduledAt = new Date(data.scheduledAt);

  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: data.doctorId,
      status: { in: ACTIVE_STATUSES },
      scheduledAt: {
        gte: new Date(scheduledAt.getTime() - 30 * 60 * 1000),
        lte: new Date(scheduledAt.getTime() + 30 * 60 * 1000),
      },
    },
  });

  if (conflict) {
    res.status(409).json({ error: "Doctor has a conflicting appointment in this time slot" });
    return;
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        patientId: data.patientId,
        patientName: data.patientName,
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        scheduledAt,
        endAt: data.endAt ? new Date(data.endAt) : null,
        department: data.department,
        room: data.room,
        reason: data.reason,
        appointmentType: data.appointmentType,
        specialty: data.specialty,
        status: "BOOKED",
      },
    });

    await tx.outboxEvent.create({ data: buildAppointmentBookedOutbox(created) });
    return created;
  });

  res.status(201).json(formatAppointment(appointment));
});

router.post("/:id/cancel", async (req, res) => {
  const parsed = CancelAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  if (!ACTIVE_STATUSES.includes(existing.status)) {
    res.status(400).json({ error: `Cannot cancel appointment with status ${existing.status}` });
    return;
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: req.params.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: parsed.data.reason,
      },
    });

    await tx.outboxEvent.create({ data: buildAppointmentCancelledOutbox(updated) });
    return updated;
  });

  res.json(formatAppointment(appointment));
});

router.post("/:id/complete", async (req, res) => {
  const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  if (!ACTIVE_STATUSES.includes(existing.status)) {
    res.status(400).json({
      error: `Cannot complete appointment with status ${existing.status}`,
    });
    return;
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: req.params.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await tx.outboxEvent.create({ data: buildAppointmentCompletedOutbox(updated) });
    return updated;
  });

  res.json(formatAppointment(appointment));
});

export default router;
