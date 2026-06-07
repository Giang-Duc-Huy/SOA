import type { OutboxStore, OutboxRecord } from "./outbox.js";
import { OutboxStatus } from "./outbox.js";
import type { ProcessedEventStore } from "./consumer.js";

/**
 * Generic Prisma adapters — services pass their Prisma client models.
 * Expected Prisma models:
 *
 * model OutboxEvent { id, aggregateType, aggregateId, eventType, topic, payload, status, createdAt, publishedAt, retryCount, lastError }
 * model ProcessedEvent { eventId, eventType, processedAt }
 */

export interface PrismaOutboxDelegate {
  findMany(args: {
    where: { status: string };
    orderBy: { createdAt: "asc" };
    take: number;
  }): Promise<OutboxRecord[]>;
  update(args: {
    where: { id: string };
    data: Partial<OutboxRecord>;
  }): Promise<unknown>;
}

export interface PrismaProcessedDelegate {
  findUnique(args: { where: { eventId: string } }): Promise<{ eventId: string } | null>;
  create(args: { data: { eventId: string; eventType: string } }): Promise<unknown>;
}

export function createPrismaOutboxStore(delegate: PrismaOutboxDelegate): OutboxStore {
  return {
    async findPending(limit) {
      return delegate.findMany({
        where: { status: OutboxStatus.PENDING },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
    },
    async markPublished(id) {
      await delegate.update({
        where: { id },
        data: {
          status: OutboxStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    },
    async markFailed(id, error) {
      const records = await delegate.findMany({
        where: { status: OutboxStatus.PENDING },
        orderBy: { createdAt: "asc" },
        take: 1000,
      });
      const record = records.find((r) => r.id === id);
      await delegate.update({
        where: { id },
        data: {
          status: OutboxStatus.PENDING,
          retryCount: (record?.retryCount ?? 0) + 1,
          lastError: error,
        },
      });
    },
  };
}

export function createPrismaProcessedStore(
  delegate: PrismaProcessedDelegate
): ProcessedEventStore {
  return {
    async hasProcessed(eventId) {
      const found = await delegate.findUnique({ where: { eventId } });
      return found !== null;
    },
    async markProcessed(eventId, eventType) {
      await delegate.create({ data: { eventId, eventType } });
    },
  };
}
