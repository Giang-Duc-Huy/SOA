#!/usr/bin/env node
/**
 * Substitute AWS placeholders and pin container images before ECS register-task-definition.
 *
 * Usage:
 *   node scripts/prepare-ecs-task-defs.mjs <output-dir> <ecr-registry> <aws-account-id> [image-tag]
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const [outputDir, ecrRegistry, awsAccountId, imageTag = "latest"] = process.argv.slice(2);

if (!outputDir || !ecrRegistry || !awsAccountId) {
  console.error(
    "Usage: node scripts/prepare-ecs-task-defs.mjs <output-dir> <ecr-registry> <aws-account-id> [image-tag]",
  );
  process.exit(1);
}

const taskDefDir = join(import.meta.dirname, "..", "infra", "aws", "task-definitions");
mkdirSync(outputDir, { recursive: true });

for (const file of readdirSync(taskDefDir).filter((name) => name.endsWith(".json"))) {
  const service = file.replace(/\.json$/, "");
  const image = `${ecrRegistry}/mediflow/${service}:${imageTag}`;
  const raw = readFileSync(join(taskDefDir, file), "utf8");
  const prepared = JSON.parse(raw.replaceAll("ACCOUNT_ID", awsAccountId));

  prepared.containerDefinitions[0].image = image;

  const outPath = join(outputDir, file);
  writeFileSync(outPath, `${JSON.stringify(prepared, null, 2)}\n`);
  console.log(`Prepared ${outPath} -> ${image}`);
}
