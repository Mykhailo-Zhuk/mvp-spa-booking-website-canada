// Formatting helpers — CAD currency + Canadian locale dates/times.
// The Intl formatters are hoisted to module singletons: constructing an
// Intl.NumberFormat/DateTimeFormat is expensive (~µs), and these helpers run
// per-slot/per-row in the hot request paths. `Date.prototype.toLocale*String`
// rebuilds a formatter on every call, so we build each once and reuse it —
// output is byte-identical because toLocale*String uses the same underlying formatter.
import type { Locale } from "./i18n";

const intlTag = (locale: Locale): string => (locale === "fr" ? "fr-CA" : locale === "uk" ? "uk" : "en-CA");

const cadFormatter = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const timeFormatter = new Intl.DateTimeFormat("en-CA", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Cache one full-date formatter per locale (only en/fr/uk are used). */
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(locale: Locale): Intl.DateTimeFormat {
  let f = dateFormatters.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(intlTag(locale), { weekday: "long", month: "long", day: "numeric" });
    dateFormatters.set(locale, f);
  }
  return f;
}

const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();
function weekdayFormatter(locale: Locale): Intl.DateTimeFormat {
  let f = weekdayFormatters.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(intlTag(locale), { weekday: "long" });
    weekdayFormatters.set(locale, f);
  }
  return f;
}

export const cad = (n: number): string => cadFormatter.format(n);

export function formatDate(d: Date | string, locale: Locale = "en"): string {
  return dateFormatter(locale).format(new Date(d));
}

export function formatTime(d: Date | string): string {
  return timeFormatter.format(new Date(d));
}

export function formatDateTime(d: Date | string, locale: Locale = "en"): string {
  return `${formatDate(d, locale)} · ${formatTime(d)}`;
}

export function isoDay(d: Date | string): string {
  const dt = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function weekdayLabel(d: Date | string, locale: Locale = "en"): string {
  return weekdayFormatter(locale).format(new Date(d));
}
