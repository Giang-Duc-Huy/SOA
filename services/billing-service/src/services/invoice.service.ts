import { randomUUID } from "crypto";
import {
  BILLING_EVENTS,
  BillingInvoiceCreatedEventSchema,
  BillingInvoicePaidEventSchema,
  EVENT_TYPES,
  buildEvent,
} from "@hm/contracts";
import type { InvoiceStatus } from "../generated/client/index.js";
import { prisma } from "../db/prisma.js";
import { publishEvent } from "../kafka/producer.js";

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInvoiceInput {
  patientId: string;
  appointmentId?: string;
  status?: InvoiceStatus;
  items: InvoiceItemInput[];
}

function calcTotal(items: InvoiceItemInput[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

async function publishInvoiceCreated(
  invoiceId: string,
  patientId: string,
  totalAmount: number,
  invoiceStatus: InvoiceStatus,
  appointmentId?: string | null
) {
  const eventStatus =
    invoiceStatus === "ISSUED" ? "PENDING" : invoiceStatus === "PAID" ? "PAID" : "DRAFT";

  const event = buildEvent(
    BillingInvoiceCreatedEventSchema,
    {
      eventId: randomUUID(),
      eventType: EVENT_TYPES.BILLING_INVOICE_CREATED,
      aggregateId: invoiceId,
      aggregateType: "Invoice",
    },
    {
      invoiceId,
      patientId,
      sourceType: appointmentId ? "APPOINTMENT" : "CLINICAL",
      sourceId: appointmentId ?? invoiceId,
      totalAmount,
      currency: "VND",
      status: eventStatus,
    }
  );
  await publishEvent(BILLING_EVENTS, event);
}

export const invoiceService = {
  async createManual(input: CreateInvoiceInput) {
    const totalAmount = calcTotal(input.items);
    const status = input.status ?? "ISSUED";

    const invoice = await prisma.invoice.create({
      data: {
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        status,
        totalAmount,
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true, payments: true },
    });

    await publishInvoiceCreated(
      invoice.id,
      invoice.patientId,
      Number(invoice.totalAmount),
      invoice.status,
      invoice.appointmentId
    );

    return invoice;
  },

  /** Used by Kafka handlers to auto-generate invoices */
  async createFromEvent(input: CreateInvoiceInput) {
    if (input.appointmentId) {
      const existing = await prisma.invoice.findFirst({
        where: { appointmentId: input.appointmentId, status: { not: "CANCELLED" } },
      });
      if (existing) return existing;
    }
    return this.createManual(input);
  },

  async list() {
    return prisma.invoice.findMany({
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });
  },

  async pay(invoiceId: string, method: string, amount?: number) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return null;
    if (invoice.status === "PAID") {
      throw new Error("Invoice already paid");
    }
    if (invoice.status === "CANCELLED") {
      throw new Error("Cannot pay cancelled invoice");
    }

    const payAmount = amount ?? Number(invoice.totalAmount);
    const paidAt = new Date();

    const [payment, updatedInvoice] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId,
          method,
          amount: payAmount,
          status: "COMPLETED",
          paidAt,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID" },
        include: { items: true, payments: true },
      }),
    ]);

    const event = buildEvent(
      BillingInvoicePaidEventSchema,
      {
        eventId: randomUUID(),
        eventType: EVENT_TYPES.BILLING_INVOICE_PAID,
        aggregateId: invoiceId,
        aggregateType: "Invoice",
      },
      {
        invoiceId,
        patientId: invoice.patientId,
        paidAmount: payAmount,
        paymentMethod: (["CASH", "CARD", "INSURANCE", "TRANSFER"].includes(method)
          ? method
          : "CASH") as "CASH" | "CARD" | "INSURANCE" | "TRANSFER",
        paidAt: paidAt.toISOString(),
      }
    );
    await publishEvent(BILLING_EVENTS, event);

    // Fallback: sync analytics directly when Kafka may be unavailable
    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3009";
    fetch(`${analyticsUrl}/api/analytics/internal/revenue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, amount: payAmount, paidAt: paidAt.toISOString() }),
    }).catch(() => {});

    return { invoice: updatedInvoice, payment };
  },
};
