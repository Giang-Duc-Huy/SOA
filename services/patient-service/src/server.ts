import express from "express";
import cors from "cors";
import { createLogger } from "@hm/logger";
import { initTelemetry, metricsMiddleware, registerHealthRoutes } from "@hm/telemetry";
import patientRoutes from "./routes/patients.js";
import { startOutboxRelay } from "./lib/outbox-relay.js";

const PORT = Number(process.env.PORT ?? 3002);
const SERVICE_NAME = "patient-service";
const logger = createLogger({ serviceName: SERVICE_NAME });

async function main() {
  initTelemetry({ serviceName: SERVICE_NAME });

  try {
    await startOutboxRelay();
  } catch (err) {
    logger.warn("Outbox relay not started (Kafka may be unavailable)", {
      error: String(err),
    });
  }

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware());
  registerHealthRoutes(app);

  app.use("/api/patients", patientRoutes);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error("Unhandled error", { error: err.message });
      res.status(500).json({ error: "Internal server error" });
    }
  );

  app.listen(PORT, () => {
    logger.info(`${SERVICE_NAME} listening on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error("Failed to start service", { error: String(err) });
  process.exit(1);
});
