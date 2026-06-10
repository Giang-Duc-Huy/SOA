#!/usr/bin/env node
/**
 * Local CI verification — mirrors the lint-test-build job in GitHub Actions.
 */
import { execSync } from "child_process";

const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/ci_db" } });
};

const prismaServices = [
  "identity-rbac-service",
  "patient-service",
  "appointment-service",
  "emr-service",
  "clinical-service",
  "lab-radiology-service",
  "pharmacy-service",
  "billing-service",
  "analytics-service",
];

const buildServices = [
  "identity-rbac-service",
  "api-gateway",
  "patient-service",
  "appointment-service",
  "emr-service",
  "clinical-service",
  "lab-radiology-service",
  "pharmacy-service",
  "billing-service",
  "analytics-service",
];

run("npm ci");

for (const svc of prismaServices) {
  run(`npm run db:generate -w ${svc}`);
}

run("npm run lint");
run("npm run test");

for (const lib of ["@hm/contracts", "@hm/logger", "@hm/telemetry", "@hm/messaging"]) {
  run(`npm run build -w ${lib}`);
}

for (const svc of buildServices) {
  run(`npm run build -w ${svc}`);
}

run("npm run build -w frontend");

console.log("\nCI verification passed.");
