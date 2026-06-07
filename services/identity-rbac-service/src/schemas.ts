import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  title: z.string().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  title: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const AssignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export const CreateRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});
