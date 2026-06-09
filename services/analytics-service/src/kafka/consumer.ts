import {
  APPOINTMENT_EVENTS,
  BILLING_EVENTS,
  EVENT_TYPES,
  LAB_EVENTS,
  PHARMACY_EVENTS,
} from "@hm/contracts";
import { getKafka } from "./client.js";
import {
  handleAppointmentBooked,
  handleAppointmentCancelled,
  handleAppointmentCompleted,
  handleInvoicePaid,
  handleLabResultReady,
  handleStockLow,
} from "./handlers.js";

const SERVICE_NAME = process.env.SERVICE_NAME ?? "analytics-service";

type EventHandler = (raw: unknown) => Promise<void>;

const handlers: Record<string, EventHandler> = {
  [EVENT_TYPES.APPOINTMENT_BOOKED]: handleAppointmentBooked,
  [EVENT_TYPES.APPOINTMENT_CANCELLED]: handleAppointmentCancelled,
  [EVENT_TYPES.APPOINTMENT_COMPLETED]: handleAppointmentCompleted,
  [EVENT_TYPES.BILLING_INVOICE_PAID]: handleInvoicePaid,
  [EVENT_TYPES.PHARMACY_STOCK_LOW]: handleStockLow,
  [EVENT_TYPES.LAB_RESULT_READY]: handleLabResultReady,
};

export async function startConsumer(): Promise<void> {
  try {
    const consumer = getKafka().consumer({ groupId: `${SERVICE_NAME}-group` });
    await consumer.connect();

    const topics = [
      APPOINTMENT_EVENTS,
      BILLING_EVENTS,
      PHARMACY_EVENTS,
      LAB_EVENTS,
    ];
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
  } catch (err) {
    console.warn(`[${SERVICE_NAME}] Kafka consumer not started (may be unavailable):`, err);
  }
}
