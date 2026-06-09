import { createLogger } from "@hm/logger";
import {
  createKafkaClient,
  createProducer,
  createPrismaOutboxStore,
  OutboxRelay,
  getBrokersFromEnv,
  type PrismaOutboxDelegate,
} from "@hm/messaging";
import { prisma } from "./prisma.js";

const SERVICE_NAME = "appointment-service";

export async function startOutboxRelay() {
  const logger = createLogger({ serviceName: SERVICE_NAME });
  const kafka = createKafkaClient({
    clientId: SERVICE_NAME,
    brokers: getBrokersFromEnv(),
    logger,
  });
  const producer = await createProducer(kafka);
  const store = createPrismaOutboxStore(prisma.outboxEvent as unknown as PrismaOutboxDelegate);
  const relay = new OutboxRelay({ producer, store, logger });
  relay.start();
  return relay;
}
