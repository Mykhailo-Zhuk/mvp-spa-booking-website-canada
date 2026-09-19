// Harness-only clock freeze, preloaded into the benchmarked server via NODE_OPTIONS.
//
// The recorded goldens encode responses that depend on wall-clock "now":
//   GET /api/admin/hot-slots -> total_scanned (unbooked slots from now to now+8d)
//   GET /en                 -> the "next 5 slots" ticker
//   GET /en/packages/<slug> -> the package's first free slot
//   GET /api/admin/stats    -> revenue for the current LOCAL day
// bench/db.mjs restores the DATA before every round, but nothing restored the
// CLOCK — so the same unchanged code failed the golden gate a day later, and the
// values it depends on (slot counts, ticker contents) move on every hour boundary.
//
// Freezing the server's notion of "now" is what makes the frozen dataset actually
// frozen. The instant below is the one the goldens were recorded at, which is why
// they pass unmodified under it — that agreement is the proof it is correct.
//
// Only the spawned server gets this (see http-bench.mjs); the harness's own
// timing runs in a separate process and is unaffected.
const FROZEN = Date.parse(process.env.BENCH_FROZEN_NOW ?? "");

if (Number.isFinite(FROZEN)) {
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(FROZEN);
      else super(...args);
    }
    static now() {
      return FROZEN;
    }
  }
  // `extends Date` keeps `instanceof`, Date.parse/UTC, and Intl formatting intact;
  // only the zero-argument constructor and Date.now() are pinned.
  Object.defineProperty(globalThis, "Date", {
    value: FrozenDate,
    writable: true,
    configurable: true,
  });
}
