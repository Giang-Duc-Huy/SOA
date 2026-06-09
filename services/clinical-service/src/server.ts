import express from "express";
import cors from "cors";
import { createLogger } from "@hm/logger";
import { initTelemetry, metricsMiddleware, registerHealthRoutes } from "@hm/telemetry";
import clinicalRoutes from "./routes/clinical.js";

const PORT = Number(process.env.PORT ?? 3005);
const SERVICE_NAME = "clinical-service";
const logger = createLogger({ serviceName: SERVICE_NAME });

async function main() {
  initTelemetry({ serviceName: SERVICE_NAME });

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware());
  registerHealthRoutes(app);

  app.use("/api/clinical", clinicalRoutes);

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
