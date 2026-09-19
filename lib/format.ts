// Formatting helpers — CAD currency + Canadian locale dates/times.
import type { Locale } from "./i18n";

export const cad = (n: number): string =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

const intlTag = (locale: Locale): string => (locale === "fr" ? "fr-CA" : locale === "uk" ? "uk" : "en-CA");

export function formatDate(d: Date | string, locale: Locale = "en"): string {
  return new Date(d).toLocaleDateString(intlTag(locale), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
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
  return new Date(d).toLocaleDateString(intlTag(locale), { weekday: "long" });
}
