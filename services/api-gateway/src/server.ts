import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createLogger } from "@hm/logger";
import { initTelemetry, metricsMiddleware, registerHealthRoutes } from "@hm/telemetry";
import { SERVICE_ROUTES, WRITE_METHODS, WRITE_PERMISSION_MAP } from "./config.js";
import { jwtAuth, type GatewayRequest } from "./middleware/auth.js";

const PORT = Number(process.env.PORT ?? 3000);
const SERVICE_NAME = "api-gateway";
const logger = createLogger({ serviceName: SERVICE_NAME });

function resolvePermissions(routePath: string, method: string, basePermissions: string[] = []): string[] {
  const perms = [...basePermissions];
  if (WRITE_METHODS.has(method)) {
    const writePerm = WRITE_PERMISSION_MAP[routePath];
    if (writePerm && !perms.includes(writePerm)) {
      perms.push(writePerm);
    }
  }
  return perms;
}

async function main() {
  initTelemetry({ serviceName: SERVICE_NAME });

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware());
  registerHealthRoutes(app);

  app.get("/api/gateway/routes", (_req, res) => {
    res.json({
      routes: SERVICE_ROUTES.map((r) => ({
        path: r.path,
        public: r.public ?? false,
        permissions: r.permissions ?? [],
      })),
    });
  });

  for (const route of SERVICE_ROUTES) {
    const authMiddleware = route.public
      ? (_req: express.Request, _res: express.Response, next: express.NextFunction) => next()
      : (req: GatewayRequest, res: express.Response, next: express.NextFunction) => {
          const perms = resolvePermissions(route.path, req.method, route.permissions ?? []);
          jwtAuth(perms)(req, res, next);
        };

    app.use(
      route.path,
      authMiddleware,
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        on: {
          proxyReq: (proxyReq, req) => {
            logger.debug("Proxying request", {
              method: req.method,
              path: req.url,
              target: route.target,
            });
            if (req.body && Object.keys(req.body).length > 0) {
              const bodyData = JSON.stringify(req.body);
              proxyReq.setHeader("Content-Type", "application/json");
              proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          },
          error: (err, _req, res) => {
            logger.error("Proxy error", { error: err.message, target: route.target });
            if ("writeHead" in res && typeof res.writeHead === "function") {
              (res as express.Response).status(502).json({
                error: "Upstream service unavailable",
                service: route.path,
              });
            }
          },
        },
      })
    );
  }

  app.listen(PORT, () => {
    logger.info(`${SERVICE_NAME} listening on port ${PORT}`);
    logger.info("Registered routes", {
      count: SERVICE_ROUTES.length,
      routes: SERVICE_ROUTES.map((r) => r.path),
    });
  });
}

main().catch((err) => {
  logger.error("Failed to start gateway", { error: String(err) });
  process.exit(1);
});
