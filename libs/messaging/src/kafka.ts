import { Kafka, Producer, Consumer, logLevel } from "kafkajs";
import type { Logger } from "@hm/logger";

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  logger?: Logger;
}

let sharedKafka: Kafka | null = null;

export function createKafkaClient(config: KafkaConfig): Kafka {
  if (sharedKafka) return sharedKafka;

  sharedKafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    logLevel: logLevel.WARN,
    retry: {
      initialRetryTime: 300,
      retries: 8,
    },
  });

  return sharedKafka;
}

export async function createProducer(kafka: Kafka): Promise<Producer> {
  const producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  return producer;
}

export async function createConsumer(
  kafka: Kafka,
  groupId: string
): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  return consumer;
}

export function getBrokersFromEnv(): string[] {
  const brokers = process.env.KAFKA_BROKERS ?? "localhost:9092";
  return brokers.split(",").map((b) => b.trim());
}
