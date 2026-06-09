import { Router } from "express";
import { ZodError } from "zod";
import { SendNotificationSchema, TestNotificationSchema } from "../schemas/notification.js";
import { notificationService } from "../services/notification.service.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const body = SendNotificationSchema.parse(req.body);
    const notification = await notificationService.send(body);
    res.status(201).json(notification);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("[notification] send error:", err);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

router.post("/test", async (req, res) => {
  try {
    const body = TestNotificationSchema.parse(req.body);
    const notification = await notificationService.send({
      recipientId: body.recipientId ?? "00000000-0000-0000-0000-000000000099",
      channel: body.channel,
      title: "Test Notification",
      message: "Đây là thông báo test từ Notification Service.",
      eventType: "notification.test",
    });
    res.status(201).json(notification);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("[notification] test send error:", err);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const notifications = await notificationService.list();
    res.json(notifications);
  } catch (err) {
    console.error("[notification] list error:", err);
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

export default router;
