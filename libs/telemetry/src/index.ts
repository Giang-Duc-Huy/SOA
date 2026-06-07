import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";
import type { Request, Response, NextFunction, Express } from "express";

export interface TelemetryOptions {
  serviceName: string;
  serviceVersion?: string;
  metricsPort?: number;
}

let sdk: NodeSDK | null = null;
let promRegistry: Registry | null = null;
let httpRequestDuration: Histogram<string> | null = null;
let httpRequestTotal: Counter<string> | null = null;

export function initTelemetry(options: TelemetryOptions): void {
  const { serviceName, serviceVersion = "0.0.1" } = options;

  if (sdk) return;

  const prometheusExporter = new PrometheusExporter(
    { port: options.metricsPort },
    () => {
      // OTel Prometheus exporter runs its own endpoint when port is set
    }
  );

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    metricReader: prometheusExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  promRegistry = new Registry();
  promRegistry.setDefaultLabels({ service: serviceName });
  collectDefaultMetrics({ register: promRegistry });

  httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    registers: [promRegistry],
  });

  httpRequestTotal = new Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [promRegistry],
  });
}

export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const durationNs = Number(process.hrtime.bigint() - start);
      const durationSec = durationNs / 1e9;
      const route = req.route?.path ?? req.path;
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };

      httpRequestDuration?.observe(labels, durationSec);
      httpRequestTotal?.inc(labels);
    });

    next();
  };
}

export function registerHealthRoutes(app: Express): void {
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", promRegistry?.contentType ?? "text/plain");
    res.end(await promRegistry?.metrics());
  });
}

export async function shutdownTelemetry(): Promise<void> {
  await sdk?.shutdown();
  sdk = null;
}
