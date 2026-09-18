// Ranking harness — HTTP latency against a production build.
// Pipeline: restore frozen dev.db -> next build -> next start -> warmup -> measure -> kill.
//
// Output contract (parsed by the experiment loop):
//   RESULT\t<metric>\t<median1>,<median2>,...     metric = SUM of per-case medians (lower is better)
//   GOLDEN\t<PASS|FAIL>[ \t <reason>]
//
// Flags:
//   --record-golden   write bench/golden/*.json from this run instead of comparing
//   --no-build        reuse the existing .next build (fast iteration; used by baseline repeats)
//   --skip-golden     don't compare (still restores + measures)
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restore } from "./db.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOLDEN_DIR = path.join(ROOT, "bench", "golden");
const PORT = 3100;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const CFG = JSON.parse(readFileSync(path.join(ROOT, "bench", "cases.json"), "utf8"));

const argv = process.argv.slice(2);
const RECORD = argv.includes("--record-golden");
const NO_BUILD = argv.includes("--no-build");
const SKIP_GOLDEN = argv.includes("--skip-golden");

const sessionCookie = Buffer.from(
  JSON.stringify({ email: CFG.adminEmail, isAdmin: true }),
).toString("base64url");

const log = (...a) => console.log(...a);
const fail = (msg) => {
  console.error(`FATAL: ${msg}`);
  process.exit(2);
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}\n${out.slice(-4000)}`))));
  });
}

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${ORIGIN}/en`, { redirect: "manual" });
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("server did not become ready in time");
}

function headers(c, withBody) {
  const h = {};
  if (c.auth) h["Cookie"] = `spa_demo_session=${sessionCookie}`;
  if (withBody) h["Content-Type"] = "application/json";
  return h;
}

async function call(c) {
  const res = await fetch(`${ORIGIN}${c.path}`, {
    method: c.method,
    headers: headers(c, !!c.body),
    body: c.body ? JSON.stringify(c.body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, text };
}

// HTML pages embed content-hashed asset URLs; strip them so the golden hash
// tracks page CONTENT, not the build fingerprint.
function normalize(c, text) {
  if (c.type !== "html") return text;
  return text
    .replace(/\/_next\/static\/[A-Za-z0-9._~%/-]+/g, "/_next/static/ASSET")
    .replace(/"buildId":"[^"]*"/g, '"buildId":"BUILD"');
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---------------------------------------------------------------- main
restore();
log(`db restored from pristine fixture`);

if (!NO_BUILD) {
  log(`building…`);
  await run("npm", ["run", "build"]);
}

mkdirSync(GOLDEN_DIR, { recursive: true });
const goldenPath = (name) => path.join(GOLDEN_DIR, `${name}.json`);

const server = spawn("npm", ["start", "--", "-p", String(PORT)], {
  cwd: ROOT,
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

const killServer = () => {
  try {
    process.kill(-server.pid, "SIGKILL");
  } catch {}
};
process.on("exit", killServer);

let exitCode = 0;
try {
  await waitForServer();
  log(`server ready on ${ORIGIN}`);

  const medians = [];
  const goldenFailures = [];

  for (const c of CFG.cases) {
    // Warmup — primes JIT, Prisma's plan cache and (for hot-slots) the one-off
    // promo-expiry write, so the measured phase sees a settled state.
    for (let i = 0; i < CFG.warmupIterations; i++) await call(c);

    const first = await call(c);
    if (first.status >= 400) goldenFailures.push(`${c.name}: HTTP ${first.status}`);
    const goldenValue = { status: first.status, type: c.type };

    if (c.type === "html") {
      goldenValue.sha256 = createHash("sha256").update(normalize(c, first.text)).digest("hex");
      goldenValue.bytes = first.text.length;
    } else {
      try {
        goldenValue.json = JSON.parse(first.text);
      } catch {
        goldenFailures.push(`${c.name}: response is not JSON`);
        goldenValue.raw = first.text.slice(0, 500);
      }
    }

    const gp = goldenPath(c.name);
    if (RECORD) {
      writeFileSync(gp, JSON.stringify(goldenValue, null, 2));
    } else if (!SKIP_GOLDEN && existsSync(gp)) {
      const want = JSON.parse(readFileSync(gp, "utf8"));
      if (want.status !== goldenValue.status) {
        goldenFailures.push(`${c.name}: status ${goldenValue.status} != golden ${want.status}`);
      } else if (c.type === "html") {
        if (want.sha256 !== goldenValue.sha256) {
          goldenFailures.push(`${c.name}: HTML content hash differs (bytes ${goldenValue.bytes} vs ${want.bytes})`);
        }
      } else if (JSON.stringify(want.json) !== JSON.stringify(goldenValue.json)) {
        goldenFailures.push(`${c.name}: JSON response differs from golden`);
      }
    }

    const samples = [];
    for (let i = 0; i < CFG.measuredIterations; i++) {
      const t0 = performance.now();
      await call(c);
      samples.push(performance.now() - t0);
    }
    const med = median(samples);
    medians.push(med);
    log(`  ${String(med.toFixed(2)).padStart(8)} ms  ${c.name}`);
  }

  const metric = medians.reduce((a, b) => a + b, 0);
  log(`RESULT\t${metric.toFixed(3)}\t${medians.map((m) => m.toFixed(2)).join(",")}`);
  log(`GOLDEN\t${goldenFailures.length ? "FAIL" : "PASS"}${goldenFailures.length ? "\t" + goldenFailures.join(" | ") : ""}`);
} catch (err) {
  console.error(`FATAL: ${err.message}`);
  if (serverLog) console.error(`--- server log ---\n${serverLog.slice(-3000)}`);
  exitCode = 2;
} finally {
  killServer();
}

process.exit(exitCode);
