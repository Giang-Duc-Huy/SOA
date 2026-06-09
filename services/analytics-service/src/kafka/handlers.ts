import {
  AppointmentBookedEventSchema,
  AppointmentCancelledEventSchema,
  AppointmentCompletedEventSchema,
  BillingInvoicePaidEventSchema,
  LabResultReadyEventSchema,
  PharmacyStockLowEventSchema,
} from "@hm/contracts";
import { analyticsService } from "../services/analytics.service.js";

export async function handleAppointmentBooked(raw: unknown): Promise<void> {
  const event = AppointmentBookedEventSchema.parse(raw);
  await analyticsService.recordAppointment({
    appointmentId: event.payload.appointmentId,
    patientId: event.payload.patientId,
    status: "BOOKED",
  });
}

export async function handleAppointmentCancelled(raw: unknown): Promise<void> {
  const event = AppointmentCancelledEventSchema.parse(raw);
  await analyticsService.recordAppointment({
    appointmentId: event.payload.appointmentId,
    patientId: event.payload.patientId,
    status: "CANCELLED",
  });
}

export async function handleAppointmentCompleted(raw: unknown): Promise<void> {
  const event = AppointmentCompletedEventSchema.parse(raw);
  await analyticsService.recordAppointment({
    appointmentId: event.payload.appointmentId,
    patientId: event.payload.patientId,
    status: "COMPLETED",
  });
}

export async function handleInvoicePaid(raw: unknown): Promise<void> {
  const event = BillingInvoicePaidEventSchema.parse(raw);
  const { invoiceId, paidAmount, paidAt } = event.payload;
  await analyticsService.recordRevenue({
    invoiceId,
    amount: paidAmount,
    paidAt: new Date(paidAt),
  });
}

export async function handleStockLow(raw: unknown): Promise<void> {
  const event = PharmacyStockLowEventSchema.parse(raw);
  const { medicineId, medicineName, stockQuantity } = event.payload;
  await analyticsService.recordPharmacyStock({
    medicineId,
    medicineName,
    stockQuantity,
    eventType: event.eventType,
  });
}

export async function handleLabResultReady(raw: unknown): Promise<void> {
  const event = LabResultReadyEventSchema.parse(raw);
  await analyticsService.recordLabResult({
    labOrderId: event.payload.orderId,
    type: "LAB",
    status: "COMPLETED",
  });
}
