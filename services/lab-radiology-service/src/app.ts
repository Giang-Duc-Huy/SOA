import cors from "cors";
import express from "express";
import labOrderRoutes from "./routes/lab-orders.js";

const SERVICE_NAME = process.env.SERVICE_NAME ?? "lab-radiology-service";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
  });

  app.use("/api/v1/lab-orders", labOrderRoutes);

  return app;
}
