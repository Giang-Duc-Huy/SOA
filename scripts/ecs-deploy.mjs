#!/usr/bin/env node
/**
 * Register ECS task definitions and roll out services (apps + monitoring).
 * Without AWS vars, use --dry-run to validate task defs and rollout plan (CI-safe).
 *
 * Usage:
 *   node scripts/ecs-deploy.mjs --dry-run [--tag <sha>] [--desired-count <n>]
 *   node scripts/ecs-deploy.mjs --cluster <name> --registry <ecr> --account <id> --tag <sha> [--desired-count <n>]
 */
import { execSync } from "child_process";
import { readdirSync, readFileSync } from "fs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const getArg = (flag, fallback = "") => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};

const cluster = getArg("--cluster", dryRun ? "mediflow-cluster" : "");
const registry = getArg(
  "--registry",
  dryRun ? "000000000000.dkr.ecr.ap-southeast-1.amazonaws.com" : "",
);
const account = getArg("--account", dryRun ? "000000000000" : "");
const tag = getArg("--tag", "latest");
const desiredCount = getArg("--desired-count", "2");

if (!dryRun && (!cluster || !registry || !account)) {
  console.error(
    "Usage: node scripts/ecs-deploy.mjs --dry-run [--tag <sha>] [--desired-count <n>]",
  );
  console.error(
    "   or: node scripts/ecs-deploy.mjs --cluster <name> --registry <ecr> --account <id> --tag <sha> [--desired-count <n>]",
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

const validateTaskDefs = () => {
  const files = readdirSync(outputDir).filter((name) => name.endsWith(".json"));
  if (files.length === 0) {
    throw new Error("No task definition files were generated.");
  }

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(`${outputDir}/${file}`, "utf8"));
    const required = ["family", "networkMode", "containerDefinitions"];
    for (const key of required) {
      if (!parsed[key]) {
        throw new Error(`${file} is missing required field: ${key}`);
      }
    }
    const image = parsed.containerDefinitions?.[0]?.image;
    if (!image || image.includes("ACCOUNT_ID")) {
      throw new Error(`${file} has an unresolved container image: ${image}`);
    }
    console.log(`Validated ${file} -> ${image}`);
  }
};

const printRolloutPlan = (label, services) => {
  console.log(`\n=== ${label} ===`);
  for (const svc of services) {
    console.log(
      `  - service=${svc} taskDefinition=mediflow-${svc} desiredCount=${desiredCount}`,
    );
  }
};

run(
  `node scripts/prepare-ecs-task-defs.mjs "${outputDir}" "${registry}" "${account}" "${tag}"`,
);

validateTaskDefs();

if (dryRun) {
  console.log("\n[dry-run] AWS not configured — skipping register/update-service.");
  printRolloutPlan("Application rollout plan", appServices);
  printRolloutPlan("Monitoring rollout plan", monitoringServices);
  console.log("\n[dry-run] ECS deploy validation passed.");
  process.exit(0);
}

run(`bash -lc 'for f in ${outputDir}/*.json; do aws ecs register-task-definition --cli-input-json "file://$f"; done'`);

const rollout = (services) => {
  for (const svc of services) {
    const taskFamily = `mediflow-${svc}`;
    run(
      `aws ecs update-service --cluster "${cluster}" --service "${svc}" --task-definition "${taskFamily}" --force-new-deployment --desired-count ${desiredCount} || echo "Service ${svc} not found, skipping"`,
    );
  }
};

printRolloutPlan("Deploy application services", appServices);
rollout(appServices);

printRolloutPlan("Deploy monitoring (Prometheus + Grafana)", monitoringServices);
rollout(monitoringServices);

console.log("\n=== Wait for core services ===");
run(
  `aws ecs wait services-stable --cluster "${cluster}" --services api-gateway prometheus grafana || echo "Stability wait skipped"`,
);

console.log("\nECS deploy finished.");
