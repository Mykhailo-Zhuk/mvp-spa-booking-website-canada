// Experiment runner — one measurement per experiment, noise-suppressed.
//
// A single harness run is too noisy to judge a few-percent change. This machine
// is a desktop under a load average around 6/12 cores from unrelated apps, so
// identical code has been observed spanning ~35% between rounds. Measurement
// noise is one-sided (it can only ADD latency), so the minimum of N rounds is an
// unbiased estimator of true performance and is far more stable than the mean.
//
// Builds once, then re-measures against the SAME build — rebuilding between
// repeats would add variance, not remove it.
//
// Output:
//   EXPMETRIC\t<best metric>     <- the value the keep/discard rule compares
//   RUNS\t<every round's metric>
//   GOLDEN\t<PASS|FAIL>
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROUNDS = Number(process.env.BENCH_ROUNDS || 4);

const results = [];
let goldenFailed = null;

for (let i = 0; i < ROUNDS; i++) {
  const args = ["bench/http-bench.mjs", ...(i === 0 ? [] : ["--no-build"])];
  const r = spawnSync("node", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  process.stderr.write(out.split("\n").filter((l) => /^\s+\d/.test(l)).join("\n") + "\n");

  const m = out.match(/^RESULT\t([\d.]+)\t/m);
  const g = out.match(/^GOLDEN\t(\w+)(?:\t(.*))?$/m);
  if (!m) {
    console.error(`round ${i + 1}: no RESULT — harness crashed`);
    console.error(out.split("\n").slice(-30).join("\n"));
    process.exit(2);
  }
  results.push(Number(m[1]));
  if (g && g[1] !== "PASS") goldenFailed = g[2] || "golden mismatch";
}

const best = Math.min(...results);
console.log(`RUNS\t${results.map((r) => r.toFixed(3)).join(",")}`);
console.log(`EXPMETRIC\t${best.toFixed(3)}`);
console.log(`GOLDEN\t${goldenFailed ? "FAIL" : "PASS"}${goldenFailed ? "\t" + goldenFailed : ""}`);
process.exit(goldenFailed ? 1 : 0);
