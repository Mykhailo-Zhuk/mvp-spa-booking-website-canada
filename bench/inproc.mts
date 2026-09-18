// Supplementary signal — direct micro-benchmark of pure lib/* helpers.
// NOT the ranking metric (that is bench/http-bench.mjs); this exists to give a
// fast, no-build read on module-level work such as Intl formatter construction,
// which is otherwise buried inside per-slot loops in the HTTP path.
//
// Run: npx tsx bench/inproc.mts
import { cad, formatDate, formatTime, weekdayLabel, isoDay } from "../lib/format";
import { calculatePrice } from "../lib/taxes";
import { t } from "../lib/i18n";

const ITER = 200_000;

function bench(name: string, fn: (i: number) => unknown) {
  for (let i = 0; i < 20_000; i++) fn(i); // warmup
  const t0 = performance.now();
  for (let i = 0; i < ITER; i++) fn(i);
  const perOp = ((performance.now() - t0) * 1e6) / ITER; // nanoseconds
  console.log(`${perOp.toFixed(1).padStart(10)} ns/op  ${name}`);
  return perOp;
}

const d = new Date("2026-08-21T14:30:00");
const total = [
  bench("cad()", () => cad(1234.56)),
  bench("formatTime()", () => formatTime(d)),
  bench("formatDate()", () => formatDate(d, "fr")),
  bench("weekdayLabel()", () => weekdayLabel(d, "en")),
  bench("isoDay()", () => isoDay(d)),
  bench("calculatePrice()", () => calculatePrice(120, { province: "ON", tipPercent: 0.15 })),
  bench("t()", () => t("fr", "book.confirm")),
].reduce((a, b) => a + b, 0);

console.log(`INPROC\t${total.toFixed(1)}\t(ns/op, sum of medians)`);
