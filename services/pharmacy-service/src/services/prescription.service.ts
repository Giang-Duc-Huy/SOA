import { randomUUID } from "crypto";
import {
  EVENT_TYPES,
  PHARMACY_EVENTS,
  PharmacyPrescriptionDispensedEventSchema,
  buildEvent,
} from "@hm/contracts";
import { prisma } from "../db/prisma.js";
import { publishEvent } from "../kafka/producer.js";
import { checkAndPublishLowStock, medicineService } from "./medicine.service.js";

interface PrescriptionItemInput {
  medicineName: string;
  quantity: number;
}

interface CreatePrescriptionInput {
  prescriptionId?: string;
  patientId: string;
  appointmentId?: string;
  items: PrescriptionItemInput[];
}

export const prescriptionService = {
  async list() {
    return prisma.prescription.findMany({
      include: { items: { include: { medicine: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async createFromEvent(input: CreatePrescriptionInput) {
    if (input.prescriptionId) {
      const existing = await prisma.prescription.findUnique({
        where: { id: input.prescriptionId },
      });
      if (existing) return existing;
    }

    const itemRecords = [];
    for (const item of input.items) {
      const medicine = await medicineService.findOrCreateByName(
        item.medicineName,
        item.quantity
      );
      itemRecords.push({ medicineId: medicine.id, quantity: item.quantity });
    }

    return prisma.prescription.create({
      data: {
        id: input.prescriptionId,
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        status: "PENDING",
        items: { create: itemRecords },
      },
      include: { items: { include: { medicine: true } } },
    });
  },

  async dispense(prescriptionId: string) {
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: { items: { include: { medicine: true } } },
    });

    if (!prescription) return null;
    if (prescription.status === "DISPENSED") {
      throw new Error("Prescription already dispensed");
    }
    if (prescription.status === "CANCELLED") {
      throw new Error("Cannot dispense cancelled prescription");
    }

    // Deduct stock for each medicine
    const dispensedItems = [];
    for (const item of prescription.items) {
      if (item.medicine.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.medicine.name}`);
      }

      const updated = await prisma.medicine.update({
        where: { id: item.medicineId },
        data: { stockQuantity: item.medicine.stockQuantity - item.quantity },
      });

      await checkAndPublishLowStock(updated);
      dispensedItems.push({
        medicineId: updated.id,
        medicineName: updated.name,
        quantity: item.quantity,
      });
    }

    const updatedPrescription = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: "DISPENSED" },
      include: { items: { include: { medicine: true } } },
    });

    const dispensedAt = new Date().toISOString();
    const event = buildEvent(
      PharmacyPrescriptionDispensedEventSchema,
      {
        eventId: randomUUID(),
        eventType: EVENT_TYPES.PHARMACY_PRESCRIPTION_DISPENSED,
        aggregateId: prescriptionId,
        aggregateType: "Prescription",
      },
      {
        prescriptionId,
        patientId: prescription.patientId,
        dispensedAt,
        items: dispensedItems,
      }
    );
    await publishEvent(PHARMACY_EVENTS, event);

    return updatedPrescription;
  },
};
