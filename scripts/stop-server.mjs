import { execSync } from "node:child_process";

import dotenv from "dotenv";

dotenv.config();
const p = String(process.env.PORT || 3000).trim();
try {
  const out = execSync(`lsof -nP -iTCP:${p} -sTCP:LISTEN -t`, { encoding: "utf8" }).trim();
  for (const line of out.split("\n")) {
    const pid = Number(line);
    if (Number.isFinite(pid) && pid > 0) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        /* ignore */
      }
    }
  }
} catch {
  /* no listener */
}
