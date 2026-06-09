import {
  AppointmentCompletedEventSchema,
  ClinicalServiceCompletedEventSchema,
} from "@hm/contracts";
import { invoiceService } from "../services/invoice.service.js";

/** Auto-create invoice when an appointment is completed */
export async function handleAppointmentCompleted(raw: unknown): Promise<void> {
  const event = AppointmentCompletedEventSchema.parse(raw);
  const { appointmentId, patientId } = event.payload;

  await invoiceService.createFromEvent({
    patientId,
    appointmentId,
    status: "ISSUED",
    items: [
      {
        description: `Khám bệnh - ${event.payload.department}`,
        quantity: 1,
        unitPrice: 200000,
      },
    ],
  });
}

/** Auto-create invoice when a clinical service is completed */
export async function handleClinicalServiceCompleted(raw: unknown): Promise<void> {
  const event = ClinicalServiceCompletedEventSchema.parse(raw);
  const { patientId, appointmentId, serviceName, serviceFee } = event.payload;

  await invoiceService.createFromEvent({
    patientId,
    appointmentId,
    status: "ISSUED",
    items: [
      {
        description: serviceName,
        quantity: 1,
        unitPrice: serviceFee,
      },
    ],
  });
}
