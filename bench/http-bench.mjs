// Ranking harness — HTTP latency against a production build.
// Pipeline: restore frozen dev.db -> next build -> next start -> warmup -> measure -> kill.
//
// Output contract (parsed by the experiment loop):
//   RESULT\t<cpuMetric>\t<wallMetric>\t<wallMedians...>
//   CPUCASES\t<cpu1>,<cpu2>,...
//   GOLDEN\t<PASS|FAIL>[ \t <reason>]
//
// PRIMARY metric is server CPU milliseconds consumed by the fixed request set,
// not wall-clock. This machine is a desktop whose ambient load drifts double
// digits over minutes (identical code measured 227 ms and 196 ms half an hour
// apart), which makes wall-clock comparisons across experiments invalid. CPU
// time is a far better proxy for "work the server had to do": it is measured in
// the server's own process group, so contention from unrelated desktop apps
// inflates wall-clock without inflating this.
//
// Wall-clock medians are still collected and reported as a secondary signal.
//
// Flags:
//   --record-golden   write bench/golden/*.json from this run instead of comparing
//   --no-build        reuse the existing .next build (fast iteration; used by baseline repeats)
//   --skip-golden     don't compare (still restores + measures)
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restore } from "./db.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOLDEN_DIR = path.join(ROOT, "bench", "golden");
const PORT = 3100;
const ORIGIN = `http://127.0.0.1:${PORT}`;

// The goldens encode wall-clock-relative responses, so the server is run with a
// frozen clock at the instant they were recorded (see bench/freeze-clock.cjs).
// TZ is pinned too because formatTime/isoDay are local-time functions and the
// recorded "10:00" label depends on it.
const FROZEN_TZ = "Europe/Kiev";
const FROZEN_NOW = "2026-09-18T21:02:11.000Z";
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

// HTML pages embed the build fingerprint in several places (asset URLs, and the
// buildId inside the RSC flight payload). `next build` mints a NEW buildId every
// run at the same string length, which shows up as identical byte counts but a
// different hash. Strip it wherever it appears, plus content-hashed asset paths,
// so the golden hash tracks page CONTENT rather than the build.
//
// MUST be read AFTER the build step: this script performs the build itself, so
// capturing it at module load would read the PREVIOUS build's id and normalize
// nothing.
let BUILD_ID = null;
function loadBuildId() {
  const p = path.join(ROOT, ".next", "BUILD_ID");
  BUILD_ID = existsSync(p) ? readFileSync(p, "utf8").trim() : null;
}

function normalize(c, text) {
  if (c.type !== "html") return text;
  let out = text
    .replace(/\/_next\/static\/[A-Za-z0-9._~%/-]+/g, "/_next/static/ASSET")
    .replace(/"buildId":"[^"]*"/g, '"buildId":"BUILD"');
  if (BUILD_ID) out = out.split(BUILD_ID).join("BUILD");
  return out;
}

/** First differing offset + context, so an HTML mismatch is diagnosable. */
function diffHint(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      const s = Math.max(0, i - 60);
      return `first diff @${i}: got …${JSON.stringify(a.slice(s, i + 60))} want …${JSON.stringify(b.slice(s, i + 60))}`;
    }
  }
  return a.length === b.length ? "identical" : `length differs ${a.length} vs ${b.length}`;
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// CPU milliseconds burned by the server's whole process group so far.
// The server is spawned detached, so it leads its own process group and we can
// attribute every descendant (npm wrapper + next-server) with one filter.
const CLK_TCK = 100; // Linux USER_HZ
function serverCpuMs(pgid) {
  let ticks = 0;
  for (const entry of readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    let stat;
    try {
      stat = readFileSync(`/proc/${entry}/stat`, "utf8");
    } catch {
      continue; // process vanished mid-scan
    }
    // comm (field 2) may contain spaces and parens — parse from the LAST ')'
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    if (Number(fields[2]) !== pgid) continue; // field 5 = pgrp
    ticks += Number(fields[11]) + Number(fields[12]); // fields 14,15 = utime,stime
  }
  return (ticks * 1000) / CLK_TCK;
}

// ---------------------------------------------------------------- main
restore();
log(`db restored from pristine fixture`);

if (!NO_BUILD) {
  log(`building…`);
  await run("npm", ["run", "build"]);
}
loadBuildId();

mkdirSync(GOLDEN_DIR, { recursive: true });
const goldenPath = (name) => path.join(GOLDEN_DIR, `${name}.json`);

// A server left behind by a killed earlier run would answer /en below, so
// waitForServer() would return immediately and this run would silently measure
// the PREVIOUS commit's code. Refuse loudly instead.
try {
  await fetch(`${ORIGIN}/en`, { redirect: "manual" });
  fail(`port ${PORT} is already answering — kill the stale server before benchmarking`);
} catch {}

const server = spawn("npm", ["start", "--", "-p", String(PORT)], {
  cwd: ROOT,
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
  env: {
    ...process.env,
    TZ: FROZEN_TZ,
    BENCH_FROZEN_NOW: FROZEN_NOW,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${path.join(ROOT, "bench", "freeze-clock.cjs")}`.trim(),
  },
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
  const cpuMs = [];
  const goldenFailures = [];

  for (const c of CFG.cases) {
    // Warmup — primes JIT, Prisma's plan cache and (for hot-slots) the one-off
    // promo-expiry write, so the measured phase sees a settled state.
    for (let i = 0; i < CFG.warmupIterations; i++) await call(c);

    const first = await call(c);
    if (first.status >= 400) goldenFailures.push(`${c.name}: HTTP ${first.status}`);
    const goldenValue = { status: first.status, type: c.type };

    if (c.type === "html") {
      const normalized = normalize(c, first.text);
      goldenValue.sha256 = createHash("sha256").update(normalized).digest("hex");
      goldenValue.bytes = first.text.length;
      // Stored only so a future mismatch can be diffed; not compared directly.
      goldenValue.normalized = normalized;
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
          const hint = want.normalized ? diffHint(normalize(c, first.text), want.normalized) : "";
          goldenFailures.push(
            `${c.name}: HTML content hash differs (bytes ${goldenValue.bytes} vs ${want.bytes})${hint ? " — " + hint : ""}`,
          );
        }
      } else if (JSON.stringify(want.json) !== JSON.stringify(goldenValue.json)) {
        goldenFailures.push(`${c.name}: JSON response differs from golden`);
      }
    }

    // Warmup is deliberately excluded from the CPU delta — it primes Prisma's
    // plan cache and hot-slots' one-off promo-expiry write, which we don't want
    // to charge to the measured phase.
    const cpuBefore = serverCpuMs(server.pid);
    const samples = [];
    for (let i = 0; i < CFG.measuredIterations; i++) {
      const t0 = performance.now();
      await call(c);
      samples.push(performance.now() - t0);
    }
    const caseCpu = serverCpuMs(server.pid) - cpuBefore;

    const med = median(samples);
    medians.push(med);
    cpuMs.push(caseCpu);
    log(`  ${String(med.toFixed(2)).padStart(8)} ms wall  ${String(caseCpu.toFixed(1)).padStart(7)} ms cpu  ${c.name}`);
  }

  const wallMetric = medians.reduce((a, b) => a + b, 0);
  const cpuMetric = cpuMs.reduce((a, b) => a + b, 0);
  log(`CPUCASES\t${cpuMs.map((m) => m.toFixed(1)).join(",")}`);
  log(`RESULT\t${cpuMetric.toFixed(3)}\t${wallMetric.toFixed(3)}\t${medians.map((m) => m.toFixed(2)).join(",")}`);
  log(`GOLDEN\t${goldenFailures.length ? "FAIL" : "PASS"}${goldenFailures.length ? "\t" + goldenFailures.join(" | ") : ""}`);
} catch (err) {
  console.error(`FATAL: ${err.message}`);
  if (serverLog) console.error(`--- server log ---\n${serverLog.slice(-3000)}`);
  exitCode = 2;
} finally {
  killServer();
}

process.exit(exitCode);
