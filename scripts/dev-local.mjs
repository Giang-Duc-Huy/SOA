import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const isWin = process.platform === "win32";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: isWin,
      ...opts,
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    child.on("error", reject);
  });
}

function runBackground(cmd, args) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: isWin,
    detached: !isWin,
  });
  if (!isWin) child.unref();
  return child;
}

async function main() {
  console.log("=== MediFlow HMS — Local Dev Stack ===\n");

  console.log("[1/6] Starting PostgreSQL...");
  runBackground("node", ["scripts/start-postgres.mjs", "--keep-alive"]);

  await run("node", ["scripts/wait-postgres.mjs"]);
  console.log("[postgres] Ready\n");

  console.log("[2/7] Starting Kafka cluster (docker)...");
  await run("node", ["scripts/start-kafka.mjs"]);

  console.log("[3/7] Starting observability (Prometheus + Grafana)...");
  try {
    await run("node", ["scripts/start-observability.mjs"]);
  } catch (err) {
    console.warn("[obs] Observability start failed:", err.message);
  }

  console.log("[4/7] Setting up environment...");
  await run("node", ["scripts/setup-env.mjs"]);

  console.log("[5/7] Pushing database schemas...");
  try {
    await run("npm", ["run", "db:push:all"]);
  } catch (err) {
    console.warn("[db] Schema push failed (may already be up-to-date):", err.message);
    console.warn("[db] Continuing — if services fail, stop all node processes and retry");
  }

  console.log("[6/7] Seeding dev sample data...");
  try {
    await run("node", ["scripts/sync-doctor-permissions.mjs"]);
    await run("node", ["scripts/seed-dev-data.mjs"]);
  } catch (err) {
    console.warn("[seed] Skipped:", err.message);
  }

  console.log("[7/7] Starting all services + frontend...\n");

  const services = [
    ["identity", "npm run dev -w identity-rbac-service"],
    ["gateway", "npm run dev -w api-gateway"],
    ["patient", "npm run dev -w patient-service"],
    ["appt", "npm run dev -w appointment-service"],
    ["emr", "npm run dev -w emr-service"],
    ["clinical", "npm run dev -w clinical-service"],
    ["lab", "npm run dev -w lab-radiology-service"],
    ["pharmacy", "npm run dev -w pharmacy-service"],
    ["billing", "npm run dev -w billing-service"],
    ["analytics", "npm run dev -w analytics-service"],
    ["frontend", "npm run dev -w frontend"],
  ];

  const names = services.map(([n]) => n).join(",");
  const colors = "blue,green,cyan,yellow,magenta,red,white,gray,blueBright,greenBright,cyanBright";
  const cmds = services.map(([, cmd]) => cmd);

  if (isWin) {
    const quoted = cmds.map((c) => `"${c}"`).join(" ");
    await run("cmd", ["/c", `npx concurrently -n ${names} -c ${colors} ${quoted}`]);
  } else {
    await run("npx", ["concurrently", "-n", names, "-c", colors, ...cmds]);
  }
}

main().catch((err) => {
  console.error("\n[dev:local] Failed:", err.message);
  process.exit(1);
});
