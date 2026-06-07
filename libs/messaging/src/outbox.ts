import { randomUUID } from "crypto";
import type { Producer } from "kafkajs";
import type { Logger } from "@hm/logger";

export enum OutboxStatus {
  PENDING = "PENDING",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
}

export interface OutboxRecord {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  topic: string;
  payload: string;
  status: OutboxStatus;
  createdAt: Date;
  publishedAt?: Date | null;
  retryCount: number;
  lastError?: string | null;
}

export interface OutboxWriter {
  create(data: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    topic: string;
    payload: unknown;
  }): Promise<OutboxRecord>;
}

export interface OutboxStore {
  findPending(limit: number): Promise<OutboxRecord[]>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  topic: string;
  payload: unknown;
}

/**
 * Use inside a Prisma transaction to persist event atomically with business data.
 */
export function createOutboxEntry(input: OutboxEventInput): {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  topic: string;
  payload: string;
  status: OutboxStatus;
  retryCount: number;
} {
  return {
    id: randomUUID(),
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    eventType: input.eventType,
    topic: input.topic,
    payload: JSON.stringify(input.payload),
    status: OutboxStatus.PENDING,
    retryCount: 0,
  };
}

export interface OutboxRelayOptions {
  producer: Producer;
  store: OutboxStore;
  logger: Logger;
  pollIntervalMs?: number;
  batchSize?: number;
  maxRetries?: number;
}

export class OutboxRelay {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly options: OutboxRelayOptions) {}

  start(): void {
    const interval = this.options.pollIntervalMs ?? 2000;
    this.timer = setInterval(() => void this.poll(), interval);
    this.options.logger.info("Outbox relay started", { interval });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const batchSize = this.options.batchSize ?? 50;
      const maxRetries = this.options.maxRetries ?? 5;
      const pending = await this.options.store.findPending(batchSize);

      for (const record of pending) {
        if (record.retryCount >= maxRetries) {
          await this.options.store.markFailed(
            record.id,
            `Max retries (${maxRetries}) exceeded`
          );
          continue;
        }

        try {
          await this.options.producer.send({
            topic: record.topic,
            messages: [
              {
                key: record.aggregateId,
                value: record.payload,
                headers: {
                  eventType: record.eventType,
                  eventId: record.id,
                  aggregateType: record.aggregateType,
                },
              },
            ],
          });
          await this.options.store.markPublished(record.id);
          this.options.logger.debug("Outbox event published", {
            eventId: record.id,
            eventType: record.eventType,
            topic: record.topic,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await this.options.store.markFailed(record.id, message);
          this.options.logger.error("Failed to publish outbox event", {
            eventId: record.id,
            error: message,
          });
        }
      }
    } finally {
      this.running = false;
    }
  }
}
