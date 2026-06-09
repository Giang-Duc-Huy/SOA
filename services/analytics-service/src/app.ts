import cors from "cors";
import express from "express";
import analyticsRoutes from "./routes/analytics.js";

const SERVICE_NAME = process.env.SERVICE_NAME ?? "analytics-service";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
  });

  app.use("/api/v1/analytics", analyticsRoutes);

  return app;
}
