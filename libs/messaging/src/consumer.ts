import type { Consumer, EachMessagePayload } from "kafkajs";
import { parseEvent, type KnownEventType } from "@hm/contracts";
import type { Logger } from "@hm/logger";
import { DLQ_SUFFIX } from "@hm/contracts";

export interface ProcessedEventStore {
  hasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string, eventType: string): Promise<void>;
}

export interface DlqPublisher {
  publish(originalTopic: string, message: Buffer | null, headers: Record<string, string>, error: string): Promise<void>;
}

export interface BaseConsumerOptions {
  consumer: Consumer;
  topics: string[];
  groupId: string;
  eventTypes: KnownEventType[];
  processedStore: ProcessedEventStore;
  dlqPublisher: DlqPublisher;
  logger: Logger;
  maxRetries?: number;
  handler: (eventType: KnownEventType, event: unknown) => Promise<void>;
}

export class BaseConsumer {
  private running = false;

  constructor(private readonly options: BaseConsumerOptions) {}

  async start(): Promise<void> {
    const { consumer, topics, logger } = this.options;

    await consumer.subscribe({ topics, fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload) => {
        await this.processMessage(payload);
      },
    });

    this.running = true;
    logger.info("Consumer started", {
      topics,
      groupId: this.options.groupId,
      eventTypes: this.options.eventTypes,
    });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    await this.options.consumer.disconnect();
    this.running = false;
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, message } = payload;
    const { logger, processedStore, dlqPublisher, handler, maxRetries = 3 } = this.options;

    const raw = message.value?.toString();
    if (!raw) return;

    let parsed: { eventId: string; eventType: string };
    try {
      parsed = JSON.parse(raw) as { eventId: string; eventType: string };
    } catch (err) {
      logger.error("Invalid JSON in message", { topic, offset: message.offset });
      return;
    }

    const { eventId, eventType } = parsed;

    if (await processedStore.hasProcessed(eventId)) {
      logger.debug("Skipping duplicate event", { eventId, eventType });
      return;
    }

    if (!this.options.eventTypes.includes(eventType as KnownEventType)) {
      logger.warn("Unhandled event type", { eventType, topic });
      return;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const event = parseEvent(eventType, JSON.parse(raw));
        await handler(eventType as KnownEventType, event);
        await processedStore.markProcessed(eventId, eventType);
        logger.info("Event processed", { eventId, eventType, attempt });
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn("Event processing failed, retrying", {
          eventId,
          eventType,
          attempt,
          error: lastError.message,
        });
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 10000));
      }
    }

    const errorMsg = lastError?.message ?? "Unknown error";
    logger.error("Event sent to DLQ", { eventId, eventType, error: errorMsg });

    const headers: Record<string, string> = {};
    if (message.headers) {
      for (const [key, value] of Object.entries(message.headers)) {
        if (value) headers[key] = value.toString();
      }
    }
    headers.originalTopic = topic;
    headers.error = errorMsg;
    headers.eventId = eventId;
    headers.eventType = eventType;

    await dlqPublisher.publish(topic, message.value, headers, errorMsg);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function dlqTopicFor(topic: string): string {
  return `${topic}${DLQ_SUFFIX}`;
}

export function createKafkaDlqPublisher(
  producer: import("kafkajs").Producer
): DlqPublisher {
  return {
    async publish(originalTopic, message, headers, error) {
      const dlqTopic = dlqTopicFor(originalTopic);
      await producer.send({
        topic: dlqTopic,
        messages: [
          {
            value: message,
            headers: {
              ...headers,
              dlqReason: error,
              dlqAt: new Date().toISOString(),
            },
          },
        ],
      });
    },
  };
}
