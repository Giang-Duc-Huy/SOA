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

/** Topic aliases for event-driven services */
export const APPOINTMENT_EVENTS = KAFKA_TOPICS.APPOINTMENT;
export const CLINICAL_EVENTS = KAFKA_TOPICS.CLINICAL;
export const BILLING_EVENTS = KAFKA_TOPICS.BILLING;
export const PHARMACY_EVENTS = KAFKA_TOPICS.PHARMACY;
export const LAB_EVENTS = KAFKA_TOPICS.LAB;
export const NOTIFICATION_EVENTS = KAFKA_TOPICS.NOTIFICATION;
export const ANALYTICS_EVENTS = KAFKA_TOPICS.ANALYTICS;

export const DLQ_SUFFIX = ".dlq";

export const EVENT_TYPES = {
  PATIENT_CREATED: "patient.created",
  PATIENT_UPDATED: "patient.updated",
  APPOINTMENT_BOOKED: "appointment.booked",
  APPOINTMENT_CANCELLED: "appointment.cancelled",
  APPOINTMENT_COMPLETED: "appointment.completed",
  EMR_ENCOUNTER_CREATED: "emr.encounter-created",
  EMR_ENCOUNTER_COMPLETED: "emr.encounter-completed",
  LAB_ORDER_REQUESTED: "lab.order-requested",
  LAB_ORDER_CREATED: "lab.order-created",
  LAB_RESULT_READY: "lab.result-ready",
  CLINICAL_SERVICE_COMPLETED: "clinical.service-completed",
  CLINICAL_PRESCRIPTION_ISSUED: "clinical.prescription-issued",
  CLINICAL_LAB_ORDER_REQUESTED: "clinical.lab-order-requested",
  PHARMACY_PRESCRIPTION_ISSUED: "pharmacy.prescription-issued",
  PHARMACY_PRESCRIPTION_DISPENSED: "pharmacy.prescription-dispensed",
  PHARMACY_STOCK_LOW: "pharmacy.stock-low",
  BILLING_INVOICE_CREATED: "billing.invoice-created",
  BILLING_INVOICE_PAID: "billing.invoice-paid",
  NOTIFICATION_SEND_REQUESTED: "notification.send-requested",
  ANALYTICS_EVENT_RECEIVED: "analytics.event-received",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
