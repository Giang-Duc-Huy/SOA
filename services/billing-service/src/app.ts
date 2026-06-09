import cors from "cors";
import express from "express";
import invoiceRoutes from "./routes/invoices.js";

const SERVICE_NAME = process.env.SERVICE_NAME ?? "billing-service";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
  });

  app.use("/api/billing/invoices", invoiceRoutes);

  return app;
}
