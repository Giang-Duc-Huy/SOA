import type { NotificationChannel } from "@prisma/client";
import { prisma } from "../db/prisma.js";

interface SendNotificationInput {
  recipientId: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  eventType?: string;
}

/** Mock delivery — logs to console instead of real Email/SMS/Push */
function mockSend(channel: NotificationChannel, title: string, message: string, recipientId: string) {
  console.log(`[notification] MOCK ${channel} → recipient=${recipientId}`);
  console.log(`  Title: ${title}`);
  console.log(`  Message: ${message}`);
}

export const notificationService = {
  async send(input: SendNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        channel: input.channel,
        title: input.title,
        message: input.message,
        eventType: input.eventType,
        status: "PENDING",
      },
    });

    try {
      mockSend(input.channel, input.title, input.message, input.recipientId);
      return prisma.notification.update({
        where: { id: notification.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch (err) {
      console.error("[notification] mock send failed:", err);
      return prisma.notification.update({
        where: { id: notification.id },
        data: { status: "FAILED" },
      });
    }
  },

  async list() {
    return prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
};
