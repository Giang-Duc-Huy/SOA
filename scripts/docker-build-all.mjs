#!/usr/bin/env node
/**
 * Build (and optionally push) all Mediflow images in one runner.
 *
 * Usage:
 *   node scripts/docker-build-all.mjs [--push] [--registry <ecr-url>] [--tag <sha>]
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const push = args.includes("--push");
const registry = args.includes("--registry") ? args[args.indexOf("--registry") + 1] : "";
const tag = args.includes("--tag") ? args[args.indexOf("--tag") + 1] : "local";

if (push && !registry) {
  console.error("--push requires --registry <ecr-url>");
  process.exit(1);
}

const catalog = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "infra", "docker", "services.json"), "utf8"),
);

for (const { name, dockerfile } of catalog.services) {
  const tags = push
    ? [`${registry}/mediflow/${name}:${tag}`, `${registry}/mediflow/${name}:latest`]
    : [`mediflow/${name}:${tag}`];

  const tagArgs = tags.map((t) => `-t "${t}"`).join(" ");
  const pushArg = push ? "--push" : "";
  const cacheFrom = `type=gha,scope=${name}`;
  const cacheTo = `type=gha,mode=max,scope=${name}`;

  const cmd = [
    "docker buildx build",
    `--file "${dockerfile}"`,
    tagArgs,
    `--cache-from ${cacheFrom}`,
    `--cache-to ${cacheTo}`,
    pushArg,
    ".",
  ].filter(Boolean).join(" ");

  console.log(`\n=== Building ${name} ===`);
  execSync(cmd, { stdio: "inherit" });
}

console.log(`\nBuilt ${catalog.services.length} images${push ? " and pushed to ECR" : ""}.`);
