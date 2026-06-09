import { z } from "zod";

export const SendNotificationSchema = z.object({
  recipientId: z.string().uuid(),
  channel: z.enum(["EMAIL", "SMS", "PUSH"]),
  title: z.string().min(1),
  message: z.string().min(1),
  eventType: z.string().optional(),
});

export const TestNotificationSchema = z.object({
  recipientId: z.string().uuid().optional(),
  channel: z.enum(["EMAIL", "SMS", "PUSH"]).default("EMAIL"),
});
