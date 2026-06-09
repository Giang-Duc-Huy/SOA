import { z } from "zod";

export const RecordVitalsSchema = z.object({
  pulse: z.number().int().min(30).max(250).optional(),
  systolicBp: z.number().int().min(60).max(250).optional(),
  diastolicBp: z.number().int().min(40).max(150).optional(),
  temperature: z.number().min(34).max(42).optional(),
  spo2: z.number().int().min(50).max(100).optional(),
  notes: z.string().optional(),
  recordedBy: z.string().optional(),
});

export const AddDiagnosisSchema = z.object({
  icd10Code: z.string().regex(/^[A-Z]\d{2}(\.\d{1,4})?$/),
  description: z.string().min(1),
  isPrimary: z.boolean().optional(),
  recordedBy: z.string().optional(),
});

export const AddPrescriptionSchema = z.object({
  drugName: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  prescribedBy: z.string().optional(),
});
