import {
  ClinicalLabOrderRequestedEventSchema,
  LabOrderRequestedEventSchema,
} from "@hm/contracts";
import { labOrderService } from "../services/lab-order.service.js";

export async function handleLabOrderRequested(raw: unknown): Promise<void> {
  const event = LabOrderRequestedEventSchema.parse(raw);
  const { patientId, appointmentId, type, testName } = event.payload;

  await labOrderService.createFromEvent({ patientId, appointmentId, type, testName });
}

export async function handleClinicalLabOrderRequested(raw: unknown): Promise<void> {
  const event = ClinicalLabOrderRequestedEventSchema.parse(raw);
  const { patientId, appointmentId, type, testName } = event.payload;

  await labOrderService.createFromEvent({ patientId, appointmentId, type, testName });
}
