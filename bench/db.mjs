// Frozen-dataset helper — the single guarantee that every experiment sees
// byte-identical data. Required because some benchmarked endpoints WRITE:
//   GET /api/admin/hot-slots -> promotion.updateMany (expires promos)
// Without a restore before each run, every iteration would measure a
// different database state and the metric would not be comparable.
import { chmodSync, copyFileSync, existsSync, rmSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DB = path.join(ROOT, "dev.db");
export const PRISTINE = path.join(ROOT, "bench", "fixtures", "dev.db.pristine");
const SIDECARS = [`${DB}-wal`, `${DB}-shm`, `${DB}-journal`];

export function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Copy the current dev.db to the pristine fixture. Run ONCE at setup. */
export function snapshot() {
  if (existsSync(PRISTINE) && !process.argv.includes("--force")) {
    console.error(`refusing to overwrite existing fixture: ${PRISTINE}`);
    console.error("pass --force if you really mean to reset the baseline dataset");
    process.exit(1);
  }
  // The fixture is kept read-only between runs, so make it writable first.
  if (existsSync(PRISTINE)) chmodSync(PRISTINE, 0o644);
  copyFileSync(DB, PRISTINE);
  chmodSync(PRISTINE, 0o444);
  console.log(`snapshot  ${PRISTINE}  ${statSync(PRISTINE).size}B  ${sha256(PRISTINE)}`);
}

/** Delete dev.db + WAL sidecars, then restore from the pristine fixture. */
export function restore() {
  if (!existsSync(PRISTINE)) throw new Error(`missing fixture: ${PRISTINE} — run \`node bench/db.mjs snapshot\` first`);
  for (const f of [DB, ...SIDECARS]) if (existsSync(f)) rmSync(f);
  copyFileSync(PRISTINE, DB);
  // copyFileSync preserves the SOURCE mode, and the fixture is deliberately kept
  // read-only — without this, dev.db lands as 0444 and every write path fails
  // with SQLITE_READONLY ("attempt to write a readonly database").
  chmodSync(DB, 0o644);
  const got = sha256(DB);
  const want = sha256(PRISTINE);
  if (got !== want) throw new Error(`restore mismatch: ${got} != ${want}`);
  return got;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "snapshot") snapshot();
  else if (cmd === "restore") console.log(`restored  ${restore()}`);
  else {
    console.error("usage: node bench/db.mjs <snapshot|restore> [--force]");
    process.exit(1);
  }
}
