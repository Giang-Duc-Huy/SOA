/** Stop all HMS dev services by killing processes on known ports */
import { execSync } from "child_process";

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 5173, 5174, 9090, 3030];

if (process.platform === "win32") {
  for (const port of PORTS) {
    try {
      const out = execSync(
        `netstat -ano | findstr ":${port} " | findstr LISTENING`,
        { encoding: "utf8" }
      );
      const pids = new Set(
        out
          .split("\n")
          .map((l) => l.trim().split(/\s+/).pop())
          .filter(Boolean)
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          console.log(`[stop] Killed PID ${pid} on port ${port}`);
        } catch {
          // ignore
        }
      }
    } catch {
      // no process on port
    }
  }
} else {
  for (const port of PORTS) {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: "ignore" });
      console.log(`[stop] Cleared port ${port}`);
    } catch {
      // ignore
    }
  }
}

console.log("[stop] Done. Run npm run dev:local to restart.");
