import express from "express";
import cors from "cors";
import { createLogger } from "@hm/logger";
import { initTelemetry, metricsMiddleware, registerHealthRoutes } from "@hm/telemetry";
import encounterRoutes from "./routes/encounters.js";
import { startOutboxRelay } from "./lib/outbox-relay.js";
import { startAppointmentCompletedConsumer } from "./consumers/appointment-completed.js";

const PORT = Number(process.env.PORT ?? 3004);
const SERVICE_NAME = "emr-service";
const logger = createLogger({ serviceName: SERVICE_NAME });

async function main() {
  initTelemetry({ serviceName: SERVICE_NAME });

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware());
  registerHealthRoutes(app);

  app.use("/api/emr/encounters", encounterRoutes);

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

  void (async () => {
    try {
      const { kafka, producer } = await startOutboxRelay();
      await startAppointmentCompletedConsumer(kafka, producer, logger);
      logger.info("Appointment completed consumer started");
    } catch (err) {
      logger.warn("Kafka messaging not started (may be unavailable)", {
        error: String(err),
      });
    }
  })();
}

main().catch((err) => {
  logger.error("Failed to start service", { error: String(err) });
  process.exit(1);
});
