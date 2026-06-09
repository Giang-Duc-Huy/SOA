#!/usr/bin/env node
/**
 * Generate .env files for all services if missing.
 * Uses embedded-postgres defaults for local dev.
 */
import { writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const servicesDir = join(import.meta.dirname, "..", "services");

const SERVICE_CONFIG = {
  "identity-rbac-service": { port: 3001, db: "identity_db" },
  "api-gateway": { port: 3000, db: null },
  "patient-service": { port: 3002, db: "patient_db" },
  "appointment-service": { port: 3003, db: "appointment_db" },
  "emr-service": { port: 3004, db: "emr_db" },
  "clinical-service": { port: 3005, db: "clinical_db" },
  "lab-radiology-service": { port: 3006, db: "lab_db" },
  "pharmacy-service": { port: 3007, db: "pharmacy_db" },
  "billing-service": { port: 3008, db: "billing_db" },
  "analytics-service": { port: 3009, db: "analytics_db" },
  "notification-service": { port: 3010, db: "notification_db" },
};

const GATEWAY_URLS = `
IDENTITY_SERVICE_URL=http://localhost:3001
PATIENT_SERVICE_URL=http://localhost:3002
APPOINTMENT_SERVICE_URL=http://localhost:3003
EMR_SERVICE_URL=http://localhost:3004
CLINICAL_SERVICE_URL=http://localhost:3005
LAB_SERVICE_URL=http://localhost:3006
PHARMACY_SERVICE_URL=http://localhost:3007
BILLING_SERVICE_URL=http://localhost:3008
ANALYTICS_SERVICE_URL=http://localhost:3009
`.trim();

function buildEnv(name, cfg) {
  const lines = [
    `PORT=${cfg.port}`,
    `SERVICE_NAME=${name}`,
    `KAFKA_BROKERS=localhost:29092,localhost:29093,localhost:29094`,
    `JWT_SECRET=dev-secret-change-in-production`,
    `LOG_LEVEL=info`,
    `NODE_ENV=development`,
  ];
  if (cfg.db) {
    lines.splice(1, 0, `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${cfg.db}?schema=public`);
  }
  if (name === "api-gateway") {
    lines.push(GATEWAY_URLS);
  }
  if (name === "billing-service") {
    lines.push("ANALYTICS_SERVICE_URL=http://localhost:3009");
  }
  return lines.join("\n") + "\n";
}

function buildEnvExample(name, cfg) {
  return buildEnv(name, cfg).replace(
    "postgresql://postgres:postgres@localhost:5432/",
    "postgresql://USER:PASSWORD@HOST:5432/"
  );
}

for (const [name, cfg] of Object.entries(SERVICE_CONFIG)) {
  const dir = join(servicesDir, name);
  if (!existsSync(dir)) continue;

  const envPath = join(dir, ".env");
  const examplePath = join(dir, ".env.example");

  writeFileSync(examplePath, buildEnvExample(name, cfg));
  if (!existsSync(envPath)) {
    writeFileSync(envPath, buildEnv(name, cfg));
    console.log(`Created ${name}/.env`);
  }
}

// Also ensure frontend env
const frontendDir = join(import.meta.dirname, "..", "frontend");
const frontendEnv = join(frontendDir, ".env");
if (!existsSync(frontendEnv)) {
  writeFileSync(frontendEnv, "VITE_API_URL=\n");
}

console.log("Environment setup complete.");
