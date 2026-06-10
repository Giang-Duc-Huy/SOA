import cors from "cors";
import express from "express";
import { metricsMiddleware, registerHealthRoutes } from "@hm/telemetry";
import analyticsRoutes from "./routes/analytics.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware());
  registerHealthRoutes(app);

  app.use("/api/analytics", analyticsRoutes);

  return app;
}
