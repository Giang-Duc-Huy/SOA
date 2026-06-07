export const KAFKA_TOPICS = {
  PATIENT: "hospital.patient.events",
  APPOINTMENT: "hospital.appointment.events",
  EMR: "hospital.emr.events",
  CLINICAL: "hospital.clinical.events",
  LAB: "hospital.lab.events",
  PHARMACY: "hospital.pharmacy.events",
  BILLING: "hospital.billing.events",
  NOTIFICATION: "hospital.notification.events",
  ANALYTICS: "hospital.analytics.events",
} as const;

export const DLQ_SUFFIX = ".dlq";

export const EVENT_TYPES = {
  PATIENT_CREATED: "patient.created",
  PATIENT_UPDATED: "patient.updated",
  APPOINTMENT_BOOKED: "appointment.booked",
  APPOINTMENT_CANCELLED: "appointment.cancelled",
  APPOINTMENT_COMPLETED: "appointment.completed",
  EMR_ENCOUNTER_CREATED: "emr.encounter-created",
  EMR_ENCOUNTER_COMPLETED: "emr.encounter-completed",
  LAB_ORDER_CREATED: "lab.order-created",
  LAB_RESULT_READY: "lab.result-ready",
  PHARMACY_PRESCRIPTION_ISSUED: "pharmacy.prescription-issued",
  PHARMACY_STOCK_LOW: "pharmacy.stock-low",
  BILLING_INVOICE_CREATED: "billing.invoice-created",
  BILLING_INVOICE_PAID: "billing.invoice-paid",
  NOTIFICATION_SEND_REQUESTED: "notification.send-requested",
  ANALYTICS_EVENT_RECEIVED: "analytics.event-received",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
