import { z } from "zod";
import { createEventEnvelope } from "../base.js";
import { EVENT_TYPES } from "../topics.js";

export const AnalyticsEventReceivedPayloadSchema = z.object({
  sourceEventType: z.string(),
  sourceEventId: z.string().uuid(),
  metricName: z.string(),
  metricValue: z.number(),
  dimensions: z.record(z.string()).optional(),
  recordedAt: z.string().datetime(),
});

export const AnalyticsEventReceivedEventSchema = createEventEnvelope(
  AnalyticsEventReceivedPayloadSchema
).extend({
  eventType: z.literal(EVENT_TYPES.ANALYTICS_EVENT_RECEIVED),
  aggregateType: z.literal("Analytics"),
});
