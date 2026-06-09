import type { Producer } from "kafkajs";
import { getKafka } from "./client.js";

let producer: Producer | null = null;
let connectFailed = false;

async function getProducer(): Promise<Producer | null> {
  if (connectFailed) return null;
  if (!producer) {
    try {
      producer = getKafka().producer({ allowAutoTopicCreation: true });
      await producer.connect();
    } catch (err) {
      connectFailed = true;
      console.warn("[billing-service] Kafka unavailable, events will not be published:", err);
      return null;
    }
  }
  return producer;
}

/** Publish a domain event to Kafka (non-blocking — logs warning on failure) */
export async function publishEvent(topic: string, event: unknown): Promise<void> {
  try {
    const p = await getProducer();
    if (!p) return;
    await p.send({
      topic,
      messages: [{ value: JSON.stringify(event) }],
    });
  } catch (err) {
    console.warn("[billing-service] Failed to publish event:", err);
  }
}
