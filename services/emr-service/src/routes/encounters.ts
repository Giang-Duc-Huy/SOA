import { Router } from "express";
import type { Prisma } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import {
  buildEncounterCreatedOutbox,
  buildEncounterCompletedOutbox,
} from "../lib/events.js";
import {
  CreateEncounterSchema,
  UpdateEncounterSchema,
  ListEncountersSchema,
} from "../schemas.js";

const router = Router();

function formatEncounter(e: {
  id: string;
  patientId: string;
  patientName: string | null;
  appointmentId: string | null;
  doctorId: string | null;
  doctorName: string | null;
  department: string | null;
  status: string;
  chiefComplaint: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}) {
  return {
    ...e,
    completedAt: e.completedAt?.toISOString() ?? null,
  };
}

router.get("/", async (req, res) => {
  const parsed = ListEncountersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const where: Prisma.EncounterWhereInput = {};
  if (parsed.data.patientId) where.patientId = parsed.data.patientId;
  if (parsed.data.status) where.status = parsed.data.status;

  const encounters = await prisma.encounter.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json({ data: encounters.map(formatEncounter) });
});

router.get("/:id", async (req, res) => {
  const encounter = await prisma.encounter.findUnique({ where: { id: req.params.id } });
  if (!encounter) {
    res.status(404).json({ error: "Encounter not found" });
    return;
  }
  res.json(formatEncounter(encounter));
});

router.get("/patient/:patientId", async (req, res) => {
  const encounters = await prisma.encounter.findMany({
    where: { patientId: req.params.patientId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: encounters.map(formatEncounter) });
});

router.post("/", async (req, res) => {
  const parsed = CreateEncounterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  const encounter = await prisma.$transaction(async (tx) => {
    const created = await tx.encounter.create({
      data: {
        patientId: data.patientId,
        patientName: data.patientName,
        appointmentId: data.appointmentId,
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        department: data.department,
        chiefComplaint: data.chiefComplaint,
        status: "DRAFT",
      },
    });

    await tx.outboxEvent.create({ data: buildEncounterCreatedOutbox(created) });
    return created;
  });

  res.status(201).json(formatEncounter(encounter));
});

router.patch("/:id", async (req, res) => {
  const parsed = UpdateEncounterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.encounter.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Encounter not found" });
    return;
  }

  const data = parsed.data;
  const updateData: Prisma.EncounterUpdateInput = {};
  if (data.chiefComplaint !== undefined) updateData.chiefComplaint = data.chiefComplaint;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.summary !== undefined) updateData.summary = data.summary;

  const encounter = await prisma.encounter.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.json(formatEncounter(encounter));
});

router.post("/:id/complete", async (req, res) => {
  const existing = await prisma.encounter.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Encounter not found" });
    return;
  }

  if (existing.status === "COMPLETED") {
    res.status(400).json({ error: "Encounter already completed" });
    return;
  }

  const encounter = await prisma.$transaction(async (tx) => {
    const updated = await tx.encounter.update({
      where: { id: req.params.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        summary: (req.body as { summary?: string }).summary ?? existing.summary,
      },
    });

    await tx.outboxEvent.create({ data: buildEncounterCompletedOutbox(updated) });
    return updated;
  });

  res.json(formatEncounter(encounter));
});

export default router;
