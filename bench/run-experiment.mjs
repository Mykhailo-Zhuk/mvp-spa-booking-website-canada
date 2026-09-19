// Experiment runner — one measurement per experiment, noise-suppressed.
//
// A single harness run is too noisy to judge a few-percent change. This machine
// is a desktop under a load average around 6/12 cores from unrelated apps, so
// identical code has been observed spanning ~35% of wall-clock between rounds.
//
// The primary metric is server CPU ms (see http-bench.mjs), which does not see
// that contention. What remains is CPU frequency scaling: Linux accounts ticks
// at the actual clock rate, so a P-state change moves this number by ~3%. That
// residual is roughly symmetric, hence the MEDIAN across rounds below.
//
// Builds once, then re-measures against the SAME build — rebuilding between
// repeats would add variance, not remove it.
//
// Output:
//   EXPMETRIC\t<median cpu>\t<median wall>   <- what the keep/discard rule compares
//   CASEMETRIC\t<name>=<median cpu ms>,...   <- per-endpoint attribution
//   RUNS\t<every round's cpu>
//   GOLDEN\t<PASS|FAIL>
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUNDS = Number(process.env.BENCH_ROUNDS || 4);
const log = (...a) => console.error(...a);

const CFG = JSON.parse(
  readFileSync(path.join(ROOT, "bench", "cases.json"), "utf8"),
);
const NAMES = CFG.cases.map((c) => c.name);

const cpuRuns = [];
const wallRuns = [];
const caseRuns = []; // per-round, per-case CPU ms
let goldenFailed = null;

for (let i = 0; i < ROUNDS; i++) {
  const args = ["bench/http-bench.mjs", ...(i === 0 ? [] : ["--no-build"])];
  // Without a timeout a wedged round blocks forever, and the outer kill leaves the
  // detached server orphaned on port 3100 — which the next run would then measure.
  const r = spawnSync("node", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 900_000,
    killSignal: "SIGKILL",
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  process.stderr.write(out.split("\n").filter((l) => /ms wall/.test(l)).join("\n") + "\n");

  const m = out.match(/^RESULT\t([\d.]+)\t([\d.]+)\t/m);
  const g = out.match(/^GOLDEN\t(\w+)(?:\t(.*))?$/m);
  if (!m) {
    console.error(`round ${i + 1}: no RESULT — harness crashed`);
    console.error(out.split("\n").slice(-30).join("\n"));
    process.exit(2);
  }
  cpuRuns.push(Number(m[1]));
  wallRuns.push(Number(m[2]));
  const cc = out.match(/^CPUCASES\t([\d.,]+)$/m);
  if (cc) caseRuns.push(cc[1].split(",").map(Number));
  if (g && g[1] !== "PASS") goldenFailed = g[2] || "golden mismatch";
}

// Median across rounds. The per-round noise here is CPU frequency scaling
// (Linux counts ticks at the actual clock rate), not sampling error, so it is
// roughly symmetric — the median is the better estimator and, unlike the
// minimum, is not biased low by a single lucky round.
const med = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

log(`cpu_metric\t${med(cpuRuns).toFixed(1)}\twall\t${med(wallRuns).toFixed(1)}`);
for (let i = 0; i < NAMES.length; i++) {
  const perCase = caseRuns.map((r) => r[i]);
  log(`  ${NAMES[i].padEnd(22)} ${med(perCase).toFixed(1).padStart(8)} ms cpu`);
}

console.log(`RUNS\t${cpuRuns.map((r) => r.toFixed(1)).join(",")}`);
console.log(`WALL\t${wallRuns.map((r) => r.toFixed(1)).join(",")}`);
console.log(`EXPMETRIC\t${med(cpuRuns).toFixed(3)}\t${med(wallRuns).toFixed(3)}`);
console.log(
  `CASEMETRIC\t${NAMES.map((n, i) => `${n}=${med(caseRuns.map((r) => r[i])).toFixed(1)}`).join(",")}`,
);
console.log(`GOLDEN\t${goldenFailed ? "FAIL" : "PASS"}${goldenFailed ? "\t" + goldenFailed : ""}`);
process.exit(goldenFailed ? 1 : 0);
