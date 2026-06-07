import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const NotificationSendRequestedPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  recipientId: z.string().uuid(),
  recipientType: z.enum(["PATIENT", "DOCTOR", "STAFF"]),
  channel: z.enum(["EMAIL", "SMS", "PUSH"]),
  template: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const NotificationSendRequestedEventSchema = createEventEnvelope(
  NotificationSendRequestedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.NOTIFICATION_SEND_REQUESTED),
  aggregateType: z.literal("Notification"),
});
