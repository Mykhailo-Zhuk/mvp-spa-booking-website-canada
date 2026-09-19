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

// lib/prisma.ts points Prisma at /tmp/dev.db when NODE_ENV=production — and the
// harness runs `next start`, which is production. Restoring only the repo copy
// would leave the server reading a file that drifts across rounds, silently
// voiding the frozen-dataset guarantee this module exists to provide. So restore
// every path the server might open; whichever it picks is then byte-identical.
export const RUNTIME_DB = "/tmp/dev.db";
const TARGETS = [DB, RUNTIME_DB];
const sidecarsOf = (f) => [`${f}-wal`, `${f}-shm`, `${f}-journal`];

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

/** Delete a database file + WAL sidecars, then restore it from the pristine fixture. */
function restoreOne(target) {
  for (const f of [target, ...sidecarsOf(target)]) if (existsSync(f)) rmSync(f);
  copyFileSync(PRISTINE, target);
  // copyFileSync preserves the SOURCE mode, and the fixture is deliberately kept
  // read-only — without this, the target lands as 0444 and every write path fails
  // with SQLITE_READONLY ("attempt to write a readonly database").
  chmodSync(target, 0o644);
  const got = sha256(target);
  const want = sha256(PRISTINE);
  if (got !== want) throw new Error(`restore mismatch for ${target}: ${got} != ${want}`);
}

/** Restore every database path the server might open, from the pristine fixture. */
export function restore() {
  if (!existsSync(PRISTINE)) throw new Error(`missing fixture: ${PRISTINE} — run \`node bench/db.mjs snapshot\` first`);
  for (const t of TARGETS) restoreOne(t);
  return sha256(DB);
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
