import cors from "cors";
import express from "express";
import notificationRoutes from "./routes/notifications.js";

const SERVICE_NAME = process.env.SERVICE_NAME ?? "notification-service";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
  });

  app.use("/api/v1/notifications", notificationRoutes);

  return app;
}
