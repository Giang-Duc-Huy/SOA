import { Router } from "express";
import type { Prisma } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import {
  buildPatientCreatedOutbox,
  buildPatientUpdatedOutbox,
  patientToPayload,
} from "../lib/events.js";
import {
  CreatePatientSchema,
  UpdatePatientSchema,
  SearchPatientsSchema,
} from "../schemas.js";

const router = Router();

function generateMrn(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `BN-${num}`;
}

function formatPatient(patient: {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  insuranceNo: string | null;
  status: string;
  lastVisitAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...patient,
    fullName: `${patient.lastName} ${patient.firstName}`,
    dateOfBirth: patient.dateOfBirth.toISOString().split("T")[0],
    lastVisitAt: patient.lastVisitAt?.toISOString() ?? null,
  };
}

router.get("/", async (req, res) => {
  const parsed = SearchPatientsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { q, status, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.PatientWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (q?.trim()) {
    const term = q.trim();
    const isMrn = term.toUpperCase().startsWith("BN-");
    const isPhone = /^[\d\s+-]+$/.test(term);

    if (isMrn) {
      where.mrn = { equals: term.toUpperCase(), mode: "insensitive" };
    } else if (isPhone) {
      const normalized = term.replace(/\s/g, "");
      where.phone = { contains: normalized };
    } else {
      where.OR = [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { mrn: { contains: term, mode: "insensitive" } },
      ];
    }
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: [{ lastVisitAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ]);

  res.json({
    data: patients.map(formatPatient),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.get("/:id", async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id } });
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(formatPatient(patient));
});

router.post("/", async (req, res) => {
  const parsed = CreatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  let mrn = generateMrn();
  let attempts = 0;

  while (attempts < 5) {
    const existing = await prisma.patient.findUnique({ where: { mrn } });
    if (!existing) break;
    mrn = generateMrn();
    attempts++;
  }

  const patient = await prisma.$transaction(async (tx) => {
    const created = await tx.patient.create({
      data: {
        mrn,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address,
        insuranceNo: data.insuranceNo,
        status: data.status ?? "ACTIVE",
      },
    });

    await tx.outboxEvent.create({ data: buildPatientCreatedOutbox(created) });
    return created;
  });

  res.status(201).json(formatPatient(patient));
});

router.patch("/:id", async (req, res) => {
  const parsed = UpdatePatientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.patient.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const data = parsed.data;
  const updateData: Prisma.PatientUpdateInput = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth);
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.insuranceNo !== undefined) updateData.insuranceNo = data.insuranceNo;
  if (data.status !== undefined) updateData.status = data.status;

  const patient = await prisma.$transaction(async (tx) => {
    const updated = await tx.patient.update({
      where: { id: req.params.id },
      data: updateData,
    });

    const changes = Object.fromEntries(
      Object.entries(patientToPayload(updated)).filter(([key, value]) => {
        const prev = patientToPayload(existing);
        return key !== "patientId" && value !== prev[key as keyof typeof prev];
      })
    );

    if (Object.keys(changes).length > 0) {
      await tx.outboxEvent.create({
        data: buildPatientUpdatedOutbox(updated, changes),
      });
    }

    return updated;
  });

  res.json(formatPatient(patient));
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.patient.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  await prisma.patient.update({
    where: { id: req.params.id },
    data: { status: "DISCHARGED" },
  });

  res.status(204).send();
});

export default router;
