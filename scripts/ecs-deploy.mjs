#!/usr/bin/env node
/**
 * Register ECS task definitions and roll out services (apps + monitoring).
 *
 * Usage:
 *   node scripts/ecs-deploy.mjs --cluster <name> --registry <ecr> --account <id> --tag <sha> [--desired-count <n>]
 */
import { execSync } from "child_process";
import { join } from "path";

const args = process.argv.slice(2);
const getArg = (flag, fallback = "") => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};

const cluster = getArg("--cluster");
const registry = getArg("--registry");
const account = getArg("--account");
const tag = getArg("--tag", "latest");
const desiredCount = getArg("--desired-count", "2");

if (!cluster || !registry || !account) {
  console.error(
    "Usage: node scripts/ecs-deploy.mjs --cluster <name> --registry <ecr> --account <id> --tag <sha> [--desired-count <n>]",
  );
  process.exit(1);
}

const appServices = [
  "api-gateway",
  "identity-rbac-service",
  "patient-service",
  "emr-service",
  "pharmacy-service",
  "billing-service",
  "analytics-service",
];

const monitoringServices = ["prometheus", "grafana"];
const outputDir = ".ecs/task-defs";

const run = (cmd) => {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

run(
  `node scripts/prepare-ecs-task-defs.mjs "${outputDir}" "${registry}" "${account}" "${tag}"`,
);

run(`bash -lc 'for f in ${outputDir}/*.json; do aws ecs register-task-definition --cli-input-json "file://$f"; done'`);

const rollout = (services) => {
  for (const svc of services) {
    const taskFamily = `mediflow-${svc}`;
    run(
      `aws ecs update-service --cluster "${cluster}" --service "${svc}" --task-definition "${taskFamily}" --force-new-deployment --desired-count ${desiredCount} || echo "Service ${svc} not found, skipping"`,
    );
  }
};

console.log("\n=== Deploy application services ===");
rollout(appServices);

console.log("\n=== Deploy monitoring (Prometheus + Grafana) ===");
rollout(monitoringServices);

console.log("\n=== Wait for core services ===");
run(
  `aws ecs wait services-stable --cluster "${cluster}" --services api-gateway prometheus grafana || echo "Stability wait skipped"`,
);

console.log("\nECS deploy finished.");
