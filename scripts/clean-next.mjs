import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const projectNext = path.resolve(".next");

function removeProjectNext() {
  if (!fs.existsSync(projectNext)) return;

  if (process.platform === "win32") {
    try {
      execSync(`cmd /c rmdir "${projectNext}"`, { stdio: "ignore" });
      return;
    } catch {
      // not a junction — remove as directory
    }
  }

  try {
    fs.rmSync(projectNext, { recursive: true, force: true, maxRetries: 3 });
    console.log(`Removed ${projectNext}`);
  } catch {
    // ignore
  }
}

removeProjectNext();

if (process.platform === "win32" && process.env.LOCALAPPDATA) {
  const legacyCache = path.join(process.env.LOCALAPPDATA, "Grofteplan", "next-cache");
  try {
    fs.rmSync(legacyCache, { recursive: true, force: true, maxRetries: 3 });
    console.log(`Removed ${legacyCache}`);
  } catch {
    // ignore
  }
}
