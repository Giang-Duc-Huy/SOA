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

  console.log("[1/4] Starting PostgreSQL...");
  runBackground("node", ["scripts/start-postgres.mjs", "--keep-alive"]);

  // Wait for postgres to be ready
  for (let i = 0; i < 30; i++) {
    try {
      await run("node", ["-e", "import('pg').then(({default:pg})=>{const c=new pg.Client({connectionString:'postgresql://postgres:postgres@localhost:5432/postgres'});return c.connect().then(()=>c.end())})"]);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (i === 29) throw new Error("PostgreSQL did not start in time");
  }
  console.log("[postgres] Ready\n");

  console.log("[2/4] Setting up environment...");
  await run("node", ["scripts/setup-env.mjs"]);

  console.log("[3/4] Pushing database schemas...");
  await run("npm", ["run", "db:push:all"]);

  console.log("[4/4] Starting all services + frontend...\n");
  await run("npx", [
    "concurrently",
    "-n", "identity,gateway,patient,appt,emr,clinical,lab,pharmacy,billing,analytics,frontend",
    "-c", "blue,green,cyan,yellow,magenta,red,white,gray,blueBright,greenBright,cyanBright",
    "npm run dev -w identity-rbac-service",
    "npm run dev -w api-gateway",
    "npm run dev -w patient-service",
    "npm run dev -w appointment-service",
    "npm run dev -w emr-service",
    "npm run dev -w clinical-service",
    "npm run dev -w lab-radiology-service",
    "npm run dev -w pharmacy-service",
    "npm run dev -w billing-service",
    "npm run dev -w analytics-service",
    "npm run dev -w frontend",
  ]);
}

main().catch((err) => {
  console.error("\n[dev:local] Failed:", err.message);
  process.exit(1);
});
