import {
  ClinicalPrescriptionIssuedEventSchema,
  PharmacyPrescriptionIssuedEventSchema,
} from "@hm/contracts";
import { prescriptionService } from "../services/prescription.service.js";

/** Handle prescription from Clinical Service */
export async function handleClinicalPrescriptionIssued(raw: unknown): Promise<void> {
  const event = ClinicalPrescriptionIssuedEventSchema.parse(raw);
  const { patientId, appointmentId, items, prescriptionId } = event.payload;

  await prescriptionService.createFromEvent({
    prescriptionId,
    patientId,
    appointmentId,
    items: items.map((i) => ({
      medicineName: i.medicineName,
      quantity: i.quantity,
    })),
  });
}

/** Handle prescription from Pharmacy topic */
export async function handlePharmacyPrescriptionIssued(raw: unknown): Promise<void> {
  const event = PharmacyPrescriptionIssuedEventSchema.parse(raw);
  const { prescriptionId, patientId, medications } = event.payload;

  await prescriptionService.createFromEvent({
    prescriptionId,
    patientId,
    items: medications.map((m) => ({
      medicineName: m.drugName,
      quantity: m.quantity,
    })),
  });
}
