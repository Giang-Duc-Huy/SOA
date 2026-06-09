import cors from "cors";
import express from "express";
import medicineRoutes from "./routes/medicines.js";
import prescriptionRoutes from "./routes/prescriptions.js";

const SERVICE_NAME = process.env.SERVICE_NAME ?? "pharmacy-service";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
  });

  app.use("/api/pharmacy/medicines", medicineRoutes);
  app.use("/api/pharmacy/prescriptions", prescriptionRoutes);

  return app;
}
