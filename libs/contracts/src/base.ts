import { z } from "zod";

export const EventMetadataSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  aggregateId: z.string(),
  aggregateType: z.string(),
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
  occurredAt: z.string().datetime(),
  version: z.number().int().positive().default(1),
});

export type EventMetadata = z.infer<typeof EventMetadataSchema>;

export function createEventEnvelope<T extends z.ZodTypeAny>(payloadSchema: T) {
  return EventMetadataSchema.extend({
    payload: payloadSchema,
  });
}

export type EventEnvelope<T> = EventMetadata & { payload: T };
