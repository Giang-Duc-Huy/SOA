import cors from "cors";
import express from "express";
import { metricsMiddleware, registerHealthRoutes } from "@hm/telemetry";
import medicineRoutes from "./routes/medicines.js";
import prescriptionRoutes from "./routes/prescriptions.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware());
  registerHealthRoutes(app);

  app.use("/api/pharmacy/medicines", medicineRoutes);
  app.use("/api/pharmacy/prescriptions", prescriptionRoutes);

  return app;
}
