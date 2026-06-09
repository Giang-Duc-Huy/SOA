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

async function isKafkaUp() {
  try {
    const { Kafka } = await import("kafkajs");
    const kafka = new Kafka({ clientId: "health-check", brokers: ["localhost:29092"] });
    const admin = kafka.admin();
    await admin.connect();
    await admin.listTopics();
    await admin.disconnect();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await isKafkaUp()) {
    console.log("[kafka] Already running on localhost:29092");
    return;
  }

  console.log("[kafka] Starting Zookeeper + Kafka cluster via docker compose...");
  try {
    await run("docker", ["compose", "up", "-d", "zookeeper", "kafka-1", "kafka-2", "kafka-3"]);
  } catch {
    console.warn("[kafka] Docker compose failed — trying legacy docker-compose...");
    await run("docker-compose", ["up", "-d", "zookeeper", "kafka-1", "kafka-2", "kafka-3"]);
  }

  for (let i = 0; i < 30; i++) {
    if (await isKafkaUp()) {
      console.log("[kafka] Cluster ready on localhost:29092");
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Kafka did not start in time");
}

main().catch((err) => {
  console.warn("[kafka] Warning:", err.message);
  console.warn("[kafka] Services will run without event-driven features");
});
