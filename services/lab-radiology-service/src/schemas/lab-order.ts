import { z } from "zod";

export const CreateLabOrderSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  type: z.enum(["LAB", "RADIOLOGY"]),
  testName: z.string().min(1),
});

export const UpdateLabResultSchema = z.object({
  resultText: z.string().min(1),
  fileUrl: z.string().url().optional(),
});
