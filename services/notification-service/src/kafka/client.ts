import { Kafka } from "kafkajs";

const SERVICE_NAME = process.env.SERVICE_NAME ?? "notification-service";

let kafkaInstance: Kafka | null = null;

export function getKafka(): Kafka {
  if (!kafkaInstance) {
    const brokers = (process.env.KAFKA_BROKERS ?? "localhost:29092")
      .split(",")
      .map((b) => b.trim());

    kafkaInstance = new Kafka({
      clientId: SERVICE_NAME,
      brokers,
    });
  }
  return kafkaInstance;
}
