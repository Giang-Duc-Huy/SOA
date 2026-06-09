import {
  APPOINTMENT_EVENTS,
  CLINICAL_EVENTS,
  EVENT_TYPES,
} from "@hm/contracts";
import { getKafka } from "./client.js";
import {
  handleAppointmentCompleted,
  handleClinicalServiceCompleted,
} from "./handlers.js";

const SERVICE_NAME = process.env.SERVICE_NAME ?? "billing-service";

type EventHandler = (raw: unknown) => Promise<void>;

const handlers: Record<string, EventHandler> = {
  [EVENT_TYPES.APPOINTMENT_COMPLETED]: handleAppointmentCompleted,
  [EVENT_TYPES.CLINICAL_SERVICE_COMPLETED]: handleClinicalServiceCompleted,
};

/** Start Kafka consumer — subscribes to appointment & clinical topics */
export async function startConsumer(): Promise<void> {
  const consumer = getKafka().consumer({ groupId: `${SERVICE_NAME}-group` });
  await consumer.connect();

  const topics = [APPOINTMENT_EVENTS, CLINICAL_EVENTS];
  await consumer.subscribe({ topics, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const raw = message.value?.toString();
        if (!raw) return;

        const parsed = JSON.parse(raw) as { eventType?: string };
        const handler = parsed.eventType ? handlers[parsed.eventType] : undefined;

        if (handler) {
          await handler(JSON.parse(raw));
        }
      } catch (err) {
        console.error(`[${SERVICE_NAME}] Kafka consumer error on ${topic}:`, err);
      }
    },
  });

  console.log(`[${SERVICE_NAME}] Kafka consumer started on topics:`, topics);
}
