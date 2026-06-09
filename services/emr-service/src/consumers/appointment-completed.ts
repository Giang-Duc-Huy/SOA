import { randomUUID } from "crypto";
import type { Kafka, Producer } from "kafkajs";
import type { Logger } from "@hm/logger";
import {
  BaseConsumer,
  createConsumer,
  createKafkaDlqPublisher,
  createPrismaProcessedStore,
  type PrismaProcessedDelegate,
} from "@hm/messaging";
import {
  EVENT_TYPES,
  KAFKA_TOPICS,
  type AppointmentCompletedPayload,
  type KnownEventType,
} from "@hm/contracts";
import { prisma } from "../lib/prisma.js";
import { buildEncounterCreatedOutbox } from "../lib/events.js";

export async function startAppointmentCompletedConsumer(
  kafka: Kafka,
  producer: Producer,
  logger: Logger
) {
  const consumer = await createConsumer(kafka, "emr-service-appointment-completed");
  const processedStore = createPrismaProcessedStore(
    prisma.processedEvent as unknown as PrismaProcessedDelegate
  );
  const dlqPublisher = createKafkaDlqPublisher(producer);

  const baseConsumer = new BaseConsumer({
    consumer,
    topics: [KAFKA_TOPICS.APPOINTMENT],
    groupId: "emr-service-appointment-completed",
    eventTypes: [EVENT_TYPES.APPOINTMENT_COMPLETED as KnownEventType],
    processedStore,
    dlqPublisher,
    logger,
    handler: async (eventType, event) => {
      if (eventType !== EVENT_TYPES.APPOINTMENT_COMPLETED) return;

      const { payload } = event as { payload: AppointmentCompletedPayload };
      const { appointmentId, patientId, doctorId, department } = payload;

      const existing = await prisma.encounter.findUnique({
        where: { appointmentId },
      });
      if (existing) {
        logger.info("Encounter draft already exists for appointment", { appointmentId });
        return;
      }

      await prisma.$transaction(async (tx) => {
        const encounter = await tx.encounter.create({
          data: {
            id: randomUUID(),
            patientId,
            appointmentId,
            doctorId,
            department,
            status: "DRAFT",
            chiefComplaint: "Auto-created from completed appointment",
          },
        });

        await tx.outboxEvent.create({ data: buildEncounterCreatedOutbox(encounter) });
      });

      logger.info("Encounter draft created from appointment.completed", {
        appointmentId,
        patientId,
      });
    },
  });

  await baseConsumer.start();
  return baseConsumer;
}
