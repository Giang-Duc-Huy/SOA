import {
  AppointmentBookedEventSchema,
  AppointmentCancelledEventSchema,
  AppointmentCompletedEventSchema,
  BillingInvoiceCreatedEventSchema,
  BillingInvoicePaidEventSchema,
  LabResultReadyEventSchema,
  PharmacyStockLowEventSchema,
} from "@hm/contracts";
import { notificationService } from "../services/notification.service.js";

export async function handleAppointmentBooked(raw: unknown): Promise<void> {
  const event = AppointmentBookedEventSchema.parse(raw);
  const { patientId, appointmentId, scheduledAt, department } = event.payload;

  await notificationService.send({
    recipientId: patientId,
    channel: "EMAIL",
    title: "Lịch hẹn đã được đặt",
    message: `Lịch hẹn ${appointmentId} tại ${department} vào ${scheduledAt} đã được xác nhận.`,
    eventType: event.eventType,
  });
}

export async function handleAppointmentCancelled(raw: unknown): Promise<void> {
  const event = AppointmentCancelledEventSchema.parse(raw);
  const { patientId, appointmentId, reason } = event.payload;

  await notificationService.send({
    recipientId: patientId,
    channel: "SMS",
    title: "Lịch hẹn đã hủy",
    message: `Lịch hẹn ${appointmentId} đã bị hủy.${reason ? ` Lý do: ${reason}` : ""}`,
    eventType: event.eventType,
  });
}

export async function handleAppointmentCompleted(raw: unknown): Promise<void> {
  const event = AppointmentCompletedEventSchema.parse(raw);
  const { patientId, appointmentId, department } = event.payload;

  await notificationService.send({
    recipientId: patientId,
    channel: "PUSH",
    title: "Hoàn thành khám bệnh",
    message: `Buổi khám ${appointmentId} tại ${department} đã hoàn tất. Cảm ơn bạn!`,
    eventType: event.eventType,
  });
}

export async function handleInvoiceCreated(raw: unknown): Promise<void> {
  const event = BillingInvoiceCreatedEventSchema.parse(raw);
  const { patientId, invoiceId, totalAmount } = event.payload;

  await notificationService.send({
    recipientId: patientId,
    channel: "EMAIL",
    title: "Hóa đơn mới",
    message: `Hóa đơn ${invoiceId} với tổng tiền ${totalAmount.toLocaleString("vi-VN")} VND đã được tạo.`,
    eventType: event.eventType,
  });
}

export async function handleInvoicePaid(raw: unknown): Promise<void> {
  const event = BillingInvoicePaidEventSchema.parse(raw);
  const { patientId, invoiceId, paidAmount } = event.payload;

  await notificationService.send({
    recipientId: patientId,
    channel: "SMS",
    title: "Thanh toán thành công",
    message: `Hóa đơn ${invoiceId} đã thanh toán ${paidAmount.toLocaleString("vi-VN")} VND.`,
    eventType: event.eventType,
  });
}

export async function handleLabResultReady(raw: unknown): Promise<void> {
  const event = LabResultReadyEventSchema.parse(raw);
  const { patientId, orderId, resultSummary } = event.payload;

  await notificationService.send({
    recipientId: patientId,
    channel: "PUSH",
    title: "Kết quả xét nghiệm sẵn sàng",
    message: `Kết quả chỉ định ${orderId}: ${resultSummary}`,
    eventType: event.eventType,
  });
}

export async function handleStockLow(raw: unknown): Promise<void> {
  const event = PharmacyStockLowEventSchema.parse(raw);
  const { medicineName, stockQuantity, lowStockThreshold } = event.payload;

  // Notify pharmacy staff (mock recipient)
  await notificationService.send({
    recipientId: "00000000-0000-0000-0000-000000000001",
    channel: "EMAIL",
    title: "Cảnh báo tồn kho thấp",
    message: `Thuốc ${medicineName} còn ${stockQuantity} (ngưỡng: ${lowStockThreshold}). Cần nhập thêm.`,
    eventType: event.eventType,
  });
}
