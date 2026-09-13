import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

if (/OneDrive/i.test(root)) {
  spawnSync(process.execPath, [path.join(root, "scripts", "clean-next.mjs")], {
    stdio: "inherit",
    cwd: root
  });
}
