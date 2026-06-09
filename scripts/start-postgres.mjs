import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = process.env.POSTGRES_DATA_DIR ?? join(homedir(), ".mediflow-hms", "postgres");

const DATABASES = [
  "identity_db",
  "patient_db",
  "appointment_db",
  "emr_db",
  "clinical_db",
  "lab_db",
  "pharmacy_db",
  "billing_db",
  "notification_db",
  "analytics_db",
];

const CONN = "postgresql://postgres:postgres@localhost:5432/postgres";

async function isPostgresUp() {
  try {
    const client = new pg.Client({ connectionString: CONN });
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

async function createDatabases() {
  const client = new pg.Client({ connectionString: CONN });
  await client.connect();
  for (const db of DATABASES) {
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [db]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${db}"`);
      console.log(`[postgres] Created database: ${db}`);
    }
  }
  await client.end();
}

let embeddedPg = null;

async function main() {
  const keepAlive = process.argv.includes("--keep-alive");

  if (await isPostgresUp()) {
    console.log("[postgres] Already running on localhost:5432");
  } else {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    // Clean incomplete init from failed attempts
    const pgVersion = join(DATA_DIR, "PG_VERSION");
    if (existsSync(DATA_DIR) && !existsSync(pgVersion)) {
      try {
        rmSync(DATA_DIR, { recursive: true, force: true });
        mkdirSync(DATA_DIR, { recursive: true });
      } catch {
        // ignore
      }
    }
    embeddedPg = new EmbeddedPostgres({
      databaseDir: DATA_DIR,
      user: "postgres",
      password: "postgres",
      port: 5432,
      persistent: true,
      initdbFlags: ["--locale=C", "--encoding=UTF8"],
    });
    await embeddedPg.initialise();
    await embeddedPg.start();
    console.log("[postgres] Embedded PostgreSQL started on localhost:5432");
  }

  await createDatabases();
  console.log("[postgres] All databases ready");

  if (keepAlive || embeddedPg) {
    const shutdown = async () => {
      if (embeddedPg) {
        console.log("[postgres] Stopping...");
        await embeddedPg.stop();
      }
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    if (keepAlive || embeddedPg) {
      await new Promise(() => {});
    }
  }
}

main().catch((err) => {
  console.error("[postgres] Failed:", err);
  process.exit(1);
});
