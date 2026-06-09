import { copyFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const servicesDir = join(import.meta.dirname, "..", "services");

function ensureEnv(dir) {
  const example = join(dir, ".env.example");
  const env = join(dir, ".env");
  if (existsSync(example) && !existsSync(env)) {
    copyFileSync(example, env);
    console.log(`Created ${env.replace(servicesDir, "services")}`);
  }
}

for (const name of readdirSync(servicesDir)) {
  const servicePath = join(servicesDir, name);
  if (!statSync(servicePath).isDirectory()) continue;
  ensureEnv(servicePath);
}

console.log("Environment setup complete.");
