import { execSync } from "node:child_process";

/** Stopp prosesser som holder port 3000 (hengende next dev). */
function killPort3000() {
  if (process.platform !== "win32") return;
  try {
    const out = execSync('netstat -ano | findstr ":3000"', { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!/LISTENING/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`Stoppet prosess ${pid} på port 3000`);
      } catch {
        // ignore
      }
    }
  } catch {
    // port not in use
  }
}

killPort3000();
