import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  RecordVitalsSchema,
  AddDiagnosisSchema,
  AddPrescriptionSchema,
} from "../schemas.js";

const router = Router();

function vitalStatus(vital: {
  pulse: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  temperature: number | null;
  spo2: number | null;
}) {
  const statuses: Record<string, string> = {};

  if (vital.pulse != null) {
    statuses.pulse =
      vital.pulse >= 60 && vital.pulse <= 100 ? "Normal" : "Abnormal";
  }
  if (vital.systolicBp != null && vital.diastolicBp != null) {
    statuses.bloodPressure =
      vital.systolicBp <= 130 && vital.diastolicBp <= 85
        ? "Normal"
        : vital.systolicBp <= 140
          ? "Slightly High"
          : "High";
  }
  if (vital.temperature != null) {
    statuses.temperature =
      vital.temperature >= 36.1 && vital.temperature <= 37.2
        ? "Normal"
        : "Abnormal";
  }
  if (vital.spo2 != null) {
    statuses.spo2 = vital.spo2 >= 95 ? "Stable" : "Low";
  }

  return statuses;
}

router.get("/encounters/:encounterId/vitals", async (req, res) => {
  const vitals = await prisma.vitalSign.findMany({
    where: { encounterId: req.params.encounterId },
    orderBy: { recordedAt: "desc" },
  });

  res.json({
    data: vitals.map((v) => ({
      ...v,
      status: vitalStatus(v),
    })),
  });
});

router.post("/encounters/:encounterId/vitals", async (req, res) => {
  const parsed = RecordVitalsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const vital = await prisma.vitalSign.create({
    data: {
      encounterId: req.params.encounterId,
      ...parsed.data,
    },
  });

  res.status(201).json({
    ...vital,
    status: vitalStatus(vital),
  });
});

router.get("/encounters/:encounterId/diagnoses", async (req, res) => {
  const diagnoses = await prisma.diagnosis.findMany({
    where: { encounterId: req.params.encounterId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  res.json({ data: diagnoses });
});

router.post("/encounters/:encounterId/diagnoses", async (req, res) => {
  const parsed = AddDiagnosisSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (parsed.data.isPrimary) {
    await prisma.diagnosis.updateMany({
      where: { encounterId: req.params.encounterId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const diagnosis = await prisma.diagnosis.create({
    data: {
      encounterId: req.params.encounterId,
      ...parsed.data,
    },
  });

  res.status(201).json(diagnosis);
});

router.get("/encounters/:encounterId/prescriptions", async (req, res) => {
  const prescriptions = await prisma.prescription.findMany({
    where: { encounterId: req.params.encounterId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: prescriptions });
});

router.post("/encounters/:encounterId/prescriptions", async (req, res) => {
  const parsed = AddPrescriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prescription = await prisma.prescription.create({
    data: {
      encounterId: req.params.encounterId,
      ...parsed.data,
    },
  });

  res.status(201).json(prescription);
});

router.get("/encounters/:encounterId/summary", async (req, res) => {
  const encounterId = req.params.encounterId;

  const [vitals, diagnoses, prescriptions] = await Promise.all([
    prisma.vitalSign.findMany({
      where: { encounterId },
      orderBy: { recordedAt: "desc" },
      take: 1,
    }),
    prisma.diagnosis.findMany({ where: { encounterId } }),
    prisma.prescription.findMany({ where: { encounterId } }),
  ]);

  const latestVitals = vitals[0] ?? null;

  res.json({
    encounterId,
    vitals: latestVitals
      ? { ...latestVitals, status: vitalStatus(latestVitals) }
      : null,
    diagnoses,
    prescriptions,
  });
});

export default router;
