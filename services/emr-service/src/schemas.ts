import { z } from "zod";

export const CreateEncounterSchema = z.object({
  patientId: z.string().uuid(),
  patientName: z.string().optional(),
  appointmentId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  doctorName: z.string().optional(),
  department: z.string().optional(),
  chiefComplaint: z.string().optional(),
});

export const UpdateEncounterSchema = z.object({
  chiefComplaint: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED"]).optional(),
  summary: z.string().optional(),
});

export const ListEncountersSchema = z.object({
  patientId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED"]).optional(),
});
