import { randomUUID } from "crypto";
import {
  EVENT_TYPES,
  LAB_EVENTS,
  LabOrderCreatedEventSchema,
  LabResultReadyEventSchema,
  buildEvent,
} from "@hm/contracts";
import type { LabOrderType } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { publishEvent } from "../kafka/producer.js";

interface CreateLabOrderInput {
  patientId: string;
  appointmentId?: string;
  type: LabOrderType;
  testName: string;
}

async function publishOrderCreated(order: {
  id: string;
  patientId: string;
  testName: string;
}) {
  const event = buildEvent(
    LabOrderCreatedEventSchema,
    {
      eventId: randomUUID(),
      eventType: EVENT_TYPES.LAB_ORDER_CREATED,
      aggregateId: order.id,
      aggregateType: "LabOrder",
    },
    {
      orderId: order.id,
      patientId: order.patientId,
      orderedBy: "00000000-0000-0000-0000-000000000000",
      testType: order.testName,
      priority: "ROUTINE",
    }
  );
  await publishEvent(LAB_EVENTS, event);
}

export const labOrderService = {
  async create(input: CreateLabOrderInput) {
    const order = await prisma.labOrder.create({
      data: {
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        type: input.type,
        testName: input.testName,
        status: "ORDERED",
      },
      include: { results: true },
    });

    await publishOrderCreated(order);
    return order;
  },

  async createFromEvent(input: CreateLabOrderInput) {
    const existing = await prisma.labOrder.findFirst({
      where: {
        patientId: input.patientId,
        testName: input.testName,
        appointmentId: input.appointmentId ?? null,
        status: { not: "CANCELLED" },
      },
    });
    if (existing) return existing;
    return this.create(input);
  },

  async list() {
    return prisma.labOrder.findMany({
      include: { results: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.labOrder.findUnique({
      where: { id },
      include: { results: true },
    });
  },

  async updateResult(id: string, resultText: string, fileUrl?: string) {
    const order = await prisma.labOrder.findUnique({ where: { id } });
    if (!order) return null;
    if (order.status === "CANCELLED") {
      throw new Error("Cannot update cancelled order");
    }

    const completedAt = new Date();

    const [labResult, updatedOrder] = await prisma.$transaction([
      prisma.labResult.create({
        data: {
          labOrderId: id,
          resultText,
          fileUrl,
          completedAt,
        },
      }),
      prisma.labOrder.update({
        where: { id },
        data: { status: "COMPLETED", result: resultText },
        include: { results: true },
      }),
    ]);

    const event = buildEvent(
      LabResultReadyEventSchema,
      {
        eventId: randomUUID(),
        eventType: EVENT_TYPES.LAB_RESULT_READY,
        aggregateId: id,
        aggregateType: "LabOrder",
      },
      {
        orderId: id,
        patientId: order.patientId,
        resultSummary: resultText,
        completedAt: completedAt.toISOString(),
        isAbnormal: false,
      }
    );
    await publishEvent(LAB_EVENTS, event);

    return { order: updatedOrder, result: labResult };
  },
};
