import { z } from "zod";

export const CreatePatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  insuranceNo: z.string().optional(),
  status: z
    .enum(["ACTIVE", "IN_TREATMENT", "DISCHARGED", "EMERGENCY", "RE_EXAM"])
    .optional(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

export const SearchPatientsSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
