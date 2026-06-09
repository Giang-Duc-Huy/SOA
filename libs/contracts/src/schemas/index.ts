/** Zod schemas for event payloads — re-exported for service-level validation */
export {
  AppointmentBookedPayloadSchema,
  AppointmentCancelledPayloadSchema,
  AppointmentCompletedPayloadSchema,
} from "../events/appointment.js";

export {
  BillingInvoiceCreatedPayloadSchema,
  BillingInvoicePaidPayloadSchema,
} from "../events/billing.js";

export {
  PharmacyPrescriptionIssuedPayloadSchema,
  PharmacyPrescriptionDispensedPayloadSchema,
  PharmacyStockLowPayloadSchema,
} from "../events/pharmacy.js";

export {
  LabOrderCreatedPayloadSchema,
  LabOrderRequestedPayloadSchema,
  LabResultReadyPayloadSchema,
} from "../events/lab.js";

export {
  ClinicalServiceCompletedPayloadSchema,
  ClinicalPrescriptionIssuedPayloadSchema,
  ClinicalLabOrderRequestedPayloadSchema,
} from "../events/clinical.js";

export { NotificationSendRequestedPayloadSchema } from "../events/notification.js";
