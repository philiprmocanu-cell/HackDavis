import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MD = path.join(__dirname, "..", "curriculum-codes-directory.md");

/** Lines use em dash: RTKxxxxx — Title — Description */
const LINE_RE = /^RTK(\d{5})\s*[—–]\s*(.+?)\s*[—–]\s*(.+)$/u;

let mapCache = /** @type {Map<string, string> | null} */ (null);
let mapMtimeMs = 0;

function curriculumMdPath() {
  const custom = process.env.CURRICULUM_CODES_MD?.trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return DEFAULT_MD;
}

/** @returns {Map<string, string>} canonical RTK##### → full directory line */
export function getCurriculumLineByCode() {
  const p = curriculumMdPath();
  try {
    const st = fs.statSync(p);
    if (mapCache && st.mtimeMs === mapMtimeMs) return mapCache;
    const text = fs.readFileSync(p, "utf8");
    const map = new Map();
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      const m = line.match(LINE_RE);
      if (!m) continue;
      const code = `RTK${m[1]}`;
      map.set(code, line);
    }
    mapCache = map;
    mapMtimeMs = st.mtimeMs;
    return map;
  } catch (err) {
    console.warn("[curriculum] could not load directory:", err?.message || err);
    return new Map();
  }
}

/**
 * @param {string} message normalized inbound SMS
 * @returns {{ code: string; directoryLine: string } | null}
 */
export function findRtkInMessage(message) {
  const map = getCurriculumLineByCode();
  if (map.size === 0) return null;
  const u = String(message || "").toUpperCase();
  const m = u.match(/\bRTK[\s-]*(\d{5})\b/);
  if (!m) return null;
  const code = `RTK${m[1]}`;
  const directoryLine = map.get(code);
  if (!directoryLine) return null;
  return { code, directoryLine };
}
