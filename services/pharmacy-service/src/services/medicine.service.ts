import { randomUUID } from "crypto";
import {
  EVENT_TYPES,
  PHARMACY_EVENTS,
  PharmacyStockLowEventSchema,
  buildEvent,
} from "@hm/contracts";
import { prisma } from "../db/prisma.js";
import { publishEvent } from "../kafka/producer.js";

interface CreateMedicineInput {
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  price: number;
  expiredAt?: string;
}

/** Publish low-stock alert when quantity drops below threshold */
export async function checkAndPublishLowStock(medicine: {
  id: string;
  name: string;
  stockQuantity: number;
  lowStockThreshold: number;
}) {
  if (medicine.stockQuantity > medicine.lowStockThreshold) return;

  const event = buildEvent(
    PharmacyStockLowEventSchema,
    {
      eventId: randomUUID(),
      eventType: EVENT_TYPES.PHARMACY_STOCK_LOW,
      aggregateId: medicine.id,
      aggregateType: "Inventory",
    },
    {
      medicineId: medicine.id,
      medicineName: medicine.name,
      stockQuantity: medicine.stockQuantity,
      lowStockThreshold: medicine.lowStockThreshold,
    }
  );
  await publishEvent(PHARMACY_EVENTS, event);
}

export const medicineService = {
  async create(input: CreateMedicineInput) {
    return prisma.medicine.create({
      data: {
        name: input.name,
        unit: input.unit,
        stockQuantity: input.stockQuantity,
        lowStockThreshold: input.lowStockThreshold,
        price: input.price,
        expiredAt: input.expiredAt ? new Date(input.expiredAt) : undefined,
      },
    });
  },

  async list() {
    return prisma.medicine.findMany({ orderBy: { name: "asc" } });
  },

  async getById(id: string) {
    return prisma.medicine.findUnique({ where: { id } });
  },

  async updateStock(id: string, stockQuantity: number) {
    const medicine = await prisma.medicine.update({
      where: { id },
      data: { stockQuantity },
    });
    await checkAndPublishLowStock(medicine);
    return medicine;
  },

  /** Find medicine by name (case-insensitive) or create placeholder */
  async findOrCreateByName(name: string, quantity: number) {
    let medicine = await prisma.medicine.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (!medicine) {
      medicine = await prisma.medicine.create({
        data: {
          name,
          unit: "viên",
          stockQuantity: 0,
          lowStockThreshold: 10,
          price: 10000,
        },
      });
    }
    return medicine;
  },
};
