/**
 * Start Prometheus (9090) + Grafana (3030).
 * Uses Docker Compose when available; otherwise downloads native binaries to .tools/
 */
import { spawn, execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const isWin = process.platform === "win32";

const PROM_VERSION = "2.51.2";
const GRAFANA_VERSION = "10.4.2";
const TOOLS = join(ROOT, ".tools");
const PROM_DIR = join(TOOLS, `prometheus-${PROM_VERSION}.windows-amd64`);
const PROM_BIN = join(PROM_DIR, "prometheus.exe");

function resolveGrafanaDir() {
  const candidates = [
    join(TOOLS, `grafana-v${GRAFANA_VERSION}`),
    join(TOOLS, `grafana-${GRAFANA_VERSION}`),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "bin", "grafana-server.exe"))) return dir;
  }
  return candidates[0];
}
const LOCAL_PROM_CONFIG = join(ROOT, "infra/observability/prometheus.local.yml");
const GRAFANA_PROV = join(TOOLS, "grafana-provisioning");
const GRAFANA_DATA = join(TOOLS, "grafana-data");
const PROM_DATA = join(TOOLS, "prometheus-data");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: isWin,
      ...opts,
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
    );
    child.on("error", reject);
  });
}

function hasDocker() {
  try {
    execSync("docker --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function isHttpUp(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  await new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const follow = (currentUrl) => {
      const lib = currentUrl.startsWith("https") ? https : http;
      lib
        .get(currentUrl, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            follow(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed ${res.statusCode}: ${currentUrl}`));
            return;
          }
          pipeline(res, file).then(resolve).catch(reject);
        })
        .on("error", reject);
    };
    follow(url);
  });
}

async function extractZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  if (isWin) {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
      { stdio: "inherit" }
    );
    return;
  }
  execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: "inherit" });
}

async function ensureNativePrometheus() {
  if (existsSync(PROM_BIN)) return;

  console.log("[obs] Downloading Prometheus (one-time, ~90MB)...");
  const zip = join(TOOLS, "prometheus.zip");
  await download(
    `https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.windows-amd64.zip`,
    zip
  );
  await extractZip(zip, TOOLS);
}

async function ensureNativeGrafana() {
  if (existsSync(join(resolveGrafanaDir(), "bin", "grafana-server.exe"))) return;

  console.log("[obs] Downloading Grafana OSS (one-time, ~120MB)...");
  const zip = join(TOOLS, "grafana.zip");
  if (!existsSync(zip)) {
    await download(
      `https://dl.grafana.com/oss/release/grafana-${GRAFANA_VERSION}.windows-amd64.zip`,
      zip
    );
  }
  await extractZip(zip, TOOLS);

  if (!existsSync(join(resolveGrafanaDir(), "bin", "grafana-server.exe"))) {
    throw new Error("Grafana binary not found after extract — delete .tools/grafana* and retry");
  }
}

function setupGrafanaProvisioning() {
  const dsDir = join(GRAFANA_PROV, "datasources");
  const dbDir = join(GRAFANA_PROV, "dashboards");
  mkdirSync(dsDir, { recursive: true });
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(GRAFANA_DATA, { recursive: true });

  cpSync(
    join(ROOT, "infra/observability/grafana/provisioning/datasources/prometheus.local.yml"),
    join(dsDir, "prometheus.yml")
  );

  const dashboardsSrc = join(ROOT, "infra/observability/grafana/dashboards");
  const dashboardsPath = join(TOOLS, "grafana-dashboards");
  cpSync(dashboardsSrc, dashboardsPath, { recursive: true });

  writeFileSync(
    join(dbDir, "dashboards.yml"),
    readFileSync(join(ROOT, "infra/observability/grafana/provisioning/dashboards/dashboards.yml"), "utf8").replace(
      "/var/lib/grafana/dashboards",
      dashboardsPath.replace(/\\/g, "/")
    )
  );
}

function startBackground(cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    stdio: "ignore",
    shell: isWin,
    detached: true,
    env: { ...process.env, ...env },
  });
  child.unref();
  return child;
}

async function startDockerObservability() {
  console.log("[obs] Starting Prometheus + Grafana via Docker...");
  try {
    await run("docker", ["compose", "up", "-d", "prometheus", "grafana"]);
  } catch {
    await run("docker-compose", ["up", "-d", "prometheus", "grafana"]);
  }
}

async function startNativeObservability() {
  await ensureNativePrometheus();
  await ensureNativeGrafana();
  setupGrafanaProvisioning();
  mkdirSync(PROM_DATA, { recursive: true });

  console.log("[obs] Starting native Prometheus on :9090...");
  startBackground(PROM_BIN, [
    `--config.file=${LOCAL_PROM_CONFIG}`,
    `--storage.tsdb.path=${PROM_DATA}`,
    "--web.listen-address=:9090",
  ]);

  const grafanaDir = resolveGrafanaDir();
  const grafanaBin = join(grafanaDir, "bin", "grafana-server.exe");

  console.log("[obs] Starting native Grafana on :3030...");
  startBackground(grafanaBin, [`--homepath=${grafanaDir}`], {
    GF_PATHS_DATA: GRAFANA_DATA,
    GF_PATHS_PROVISIONING: GRAFANA_PROV,
    GF_SERVER_HTTP_PORT: "3030",
    GF_SECURITY_ADMIN_USER: "admin",
    GF_SECURITY_ADMIN_PASSWORD: "admin",
    GF_USERS_ALLOW_SIGN_UP: "false",
  });
}

async function waitForReady() {
  for (let i = 0; i < 30; i++) {
    const prom = await isHttpUp("http://localhost:9090/-/ready");
    const graf = await isHttpUp("http://localhost:3030/login");
    if (prom && graf) {
      console.log("[obs] Ready:");
      console.log("  Prometheus: http://localhost:9090/targets");
      console.log("  Grafana:    http://localhost:3030  (admin / admin)");
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Observability stack did not become ready in time");
}

async function main() {
  const promUp = await isHttpUp("http://localhost:9090/-/ready");
  const grafUp = await isHttpUp("http://localhost:3030/login");

  if (promUp && grafUp) {
    console.log("[obs] Already running:");
    console.log("  Prometheus: http://localhost:9090/targets");
    console.log("  Grafana:    http://localhost:3030");
    return;
  }

  if (hasDocker()) {
    try {
      await startDockerObservability();
      await waitForReady();
      return;
    } catch (err) {
      console.warn("[obs] Docker start failed, falling back to native binaries:", err.message);
    }
  } else {
    console.log("[obs] Docker not found — using native Prometheus + Grafana binaries");
  }

  await startNativeObservability();
  await waitForReady();
}

main().catch((err) => {
  console.error("[obs] Failed:", err.message);
  process.exit(1);
});
