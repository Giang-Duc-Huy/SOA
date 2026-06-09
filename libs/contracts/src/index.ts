export * from "./base.js";
export * from "./topics.js";
export * from "./events/patient.js";
export * from "./events/appointment.js";
export * from "./events/emr.js";
export * from "./events/lab.js";
export * from "./events/pharmacy.js";
export * from "./events/billing.js";
export * from "./events/clinical.js";
export * from "./events/notification.js";
export * from "./events/analytics.js";
export * from "./schemas/index.js";

import { z } from "zod";
import {
  PatientCreatedEventSchema,
  PatientUpdatedEventSchema,
} from "./events/patient.js";
import {
  AppointmentBookedEventSchema,
  AppointmentCancelledEventSchema,
  AppointmentCompletedEventSchema,
} from "./events/appointment.js";
import {
  EmrEncounterCreatedEventSchema,
  EmrEncounterCompletedEventSchema,
} from "./events/emr.js";
import {
  LabOrderCreatedEventSchema,
  LabOrderRequestedEventSchema,
  LabResultReadyEventSchema,
} from "./events/lab.js";
import {
  ClinicalLabOrderRequestedEventSchema,
  ClinicalPrescriptionIssuedEventSchema,
  ClinicalServiceCompletedEventSchema,
} from "./events/clinical.js";
import {
  PharmacyPrescriptionDispensedEventSchema,
  PharmacyPrescriptionIssuedEventSchema,
  PharmacyStockLowEventSchema,
} from "./events/pharmacy.js";
import {
  BillingInvoiceCreatedEventSchema,
  BillingInvoicePaidEventSchema,
} from "./events/billing.js";
import { NotificationSendRequestedEventSchema } from "./events/notification.js";
import { AnalyticsEventReceivedEventSchema } from "./events/analytics.js";

export const AllEventSchemas = {
  "patient.created": PatientCreatedEventSchema,
  "patient.updated": PatientUpdatedEventSchema,
  "appointment.booked": AppointmentBookedEventSchema,
  "appointment.cancelled": AppointmentCancelledEventSchema,
  "appointment.completed": AppointmentCompletedEventSchema,
  "emr.encounter-created": EmrEncounterCreatedEventSchema,
  "emr.encounter-completed": EmrEncounterCompletedEventSchema,
  "lab.order-requested": LabOrderRequestedEventSchema,
  "lab.order-created": LabOrderCreatedEventSchema,
  "lab.result-ready": LabResultReadyEventSchema,
  "clinical.service-completed": ClinicalServiceCompletedEventSchema,
  "clinical.prescription-issued": ClinicalPrescriptionIssuedEventSchema,
  "clinical.lab-order-requested": ClinicalLabOrderRequestedEventSchema,
  "pharmacy.prescription-issued": PharmacyPrescriptionIssuedEventSchema,
  "pharmacy.prescription-dispensed": PharmacyPrescriptionDispensedEventSchema,
  "pharmacy.stock-low": PharmacyStockLowEventSchema,
  "billing.invoice-created": BillingInvoiceCreatedEventSchema,
  "billing.invoice-paid": BillingInvoicePaidEventSchema,
  "notification.send-requested": NotificationSendRequestedEventSchema,
  "analytics.event-received": AnalyticsEventReceivedEventSchema,
} as const;

export type KnownEventType = keyof typeof AllEventSchemas;

export function parseEvent(eventType: string, data: unknown) {
  const schema = AllEventSchemas[eventType as KnownEventType];
  if (!schema) {
    throw new Error(`Unknown event type: ${eventType}`);
  }
  return schema.parse(data);
}

export function buildEvent<T extends z.ZodTypeAny>(
  schema: T,
  meta: {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    correlationId?: string;
    causationId?: string;
    occurredAt?: string;
    version?: number;
  },
  payload: z.infer<T> extends { payload: infer P } ? P : z.infer<T>
) {
  return schema.parse({
    ...meta,
    occurredAt: meta.occurredAt ?? new Date().toISOString(),
    version: meta.version ?? 1,
    payload,
  });
}
