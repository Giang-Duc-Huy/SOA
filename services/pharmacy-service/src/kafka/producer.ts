import type { Producer } from "kafkajs";
import { getKafka } from "./client.js";

let producer: Producer | null = null;

async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = getKafka().producer({ allowAutoTopicCreation: true });
    await producer.connect();
  }
  return producer;
}

export async function publishEvent(topic: string, event: unknown): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic,
    messages: [{ value: JSON.stringify(event) }],
  });
}
