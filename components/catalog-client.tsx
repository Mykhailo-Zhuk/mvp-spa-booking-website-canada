"use client";

// US#1 (Наталя) — catalog with filters + real slot grid + sticky price calculator.
// Mobile-first: big touch targets, sticky footer with live HST + tip totals.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";
import { cad, isoDay, addDays, weekdayLabel } from "@/lib/format";
import { PROVINCE_LIST, DEFAULT_PROVINCE } from "@/lib/taxes";

interface Therapist { id: string; name: string; gender: string; avatarEmoji: string }
interface Slot {
  id: string; startTime: string; startLabel: string; durationMin: number;
  isBooked: boolean; isFlashSale: boolean; price: number; originalPrice: number | null;
  therapist: Therapist;
  service: { id: string; name: string; slug: string; icon: string };
}
interface ServiceOption { id: string; name: string; icon: string; slug: string }

interface PriceRes {
  base_price: number; tax: number; tip: number; total: number; tax_label: string;
  suggested_tip: number;
}

const GENDERS = ["any", "female", "male"] as const;

export default function CatalogClient({ locale, base, services }: { locale: Locale; base: string; services: ServiceOption[] }) {
  const searchParams = useSearchParams();
  const initialService = searchParams.get("service") ?? "";
  const initialDate = searchParams.get("date") ?? isoDay(new Date());
  const [date, setDate] = useState<string>(initialDate);
  const [gender, setGender] = useState<(typeof GENDERS)[number]>("any");
  const [serviceId, setServiceId] = useState<string>(initialService);
  const [province, setProvince] = useState<string>(DEFAULT_PROVINCE);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [tipOn, setTipOn] = useState(false);
  const [price, setPrice] = useState<{ slotId: string; data: PriceRes } | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);
  const autoAdvanced = useRef(false);

  // Fetch real slots on every filter change (plan Task 1.1: AJAX update + spinner).
  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({ date, gender });
    if (serviceId) q.set("serviceId", serviceId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- idiomatic fetch-on-filter-change spinner
    setLoading(true);
    fetch(`/api/availability?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const free = (d.slots ?? []).filter((s: Slot) => !s.isBooked);
        // If the chosen day has no free slots left, jump to the next day (once).
        if (!autoAdvanced.current && date === isoDay(new Date()) && free.length === 0) {
          autoAdvanced.current = true;
          setDate(isoDay(addDays(new Date(), 1)));
          return;
        }
        setSlots(d.slots ?? []);
        setSelected(null);
        setPrice(null);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date, gender, serviceId]);

  // Recompute price whenever selection / province / tip changes (backend tax logic).
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    fetch("/api/calculate-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: selected.id, province, tipPercent: tipOn ? 0.15 : 0 }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPrice({ slotId: selected.id, data: d }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected, province, tipOn]);

  // Shown price belongs to the currently selected slot (stale results are ignored).
  const shownPrice = price && selected && price.slotId === selected.id ? price.data : null;

  const openSlots = slots.filter((s) => !s.isBooked);

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h1 className="text-xl font-bold">{t(locale, "catalog.title")}</h1>
        <p className="text-sm text-forest/60">{t(locale, "catalog.subtitle")}</p>
      </div>

      {/* Date chips (next 7 days) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {days.map((d) => {
          const key = isoDay(d);
          const active = key === date;
          return (
            <button
              key={key}
              onClick={() => setDate(key)}
              className={`flex min-h-14 shrink-0 flex-col items-center justify-center rounded-2xl border px-3 ${
                active ? "border-pine bg-pine text-white" : "border-sand bg-white text-forest"
              }`}
            >
              <span className="text-[11px] font-medium opacity-80">{weekdayLabel(d, locale).slice(0, 3)}</span>
              <span className="text-sm font-bold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="space-y-2 rounded-2xl border border-sand bg-white p-3">
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`h-11 flex-1 rounded-full text-sm font-semibold ${
                gender === g ? "bg-forest text-cream" : "bg-sand text-forest"
              }`}
            >
              {g === "any" ? t(locale, "catalog.any") : g === "female" ? t(locale, "catalog.female") : t(locale, "catalog.male")}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setServiceId("")}
            className={`h-10 shrink-0 rounded-full px-3 text-sm font-medium ${
              serviceId === "" ? "bg-pine text-white" : "bg-sand text-forest"
            }`}
          >
            {t(locale, "catalog.allServices")}
          </button>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`h-10 shrink-0 rounded-full px-3 text-sm font-medium ${
                serviceId === s.id ? "bg-pine text-white" : "bg-sand text-forest"
              }`}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Slot grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-forest/50">
          <span className="animate-spin text-2xl">⏳</span>
        </div>
      ) : openSlots.length === 0 ? (
        <div className="rounded-2xl border border-sand bg-white px-4 py-10 text-center text-sm text-forest/60">
          {t(locale, "catalog.noSlots")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {openSlots.map((s) => {
            const isSel = selected?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  isSel ? "border-pine bg-pine/10 ring-2 ring-pine/30" : "border-sand bg-white hover:border-pine/40"
                }`}
              >
                <span className="text-2xl">{s.therapist.avatarEmoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-forest">
                    {s.startLabel} · {s.durationMin} мин
                  </span>
                  <span className="block truncate text-xs text-forest/60">
                    {s.therapist.name} · {s.service.name}
                  </span>
                </span>
                <span className="text-right">
                  {s.isFlashSale && s.originalPrice ? (
                    <>
                      <span className="block text-xs text-forest/40 line-through">{cad(s.originalPrice)}</span>
                      <span className="block text-sm font-bold text-ember">🔥 {cad(s.price)}</span>
                    </>
                  ) : (
                    <span className="block text-sm font-bold text-forest">{cad(s.price)}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Booked slots (grey, per plan Task 1.1 scenario) */}
      {!loading && slots.some((s) => s.isBooked) && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-forest/50">
            {t(locale, "catalog.booked")} ({slots.filter((s) => s.isBooked).length})
          </div>
          <div className="grid grid-cols-2 gap-2 opacity-60 sm:grid-cols-3">
            {slots
              .filter((s) => s.isBooked)
              .map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl bg-forest/5 px-2.5 py-2">
                  <span className="text-sm">{s.therapist.avatarEmoji}</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-forest/60">{s.startLabel}</span>
                    <span className="block truncate text-[11px] text-forest/40">{s.therapist.name}</span>
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sticky price calculator footer (plan: always visible while scrolling) */}
      <div className="sticky bottom-20 z-30 rounded-2xl border border-sand bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
        {!selected ? (
          <div className="text-center text-sm text-forest/50">{t(locale, "price.selectTreatment")}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-forest/70">{selected.service.name} · {selected.therapist.name}</span>
              <span className="text-xs text-forest/40">
                {selected.startLabel} · {t(locale, "catalog.taxNote")}
              </span>
            </div>

            {/* Province selector (tax) */}
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="h-11 w-full rounded-xl border border-sand bg-cream px-3 text-sm font-medium text-forest"
              aria-label={t(locale, "price.province")}
            >
              {PROVINCE_LIST.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} — {p.label}
                </option>
              ))}
            </select>

            {shownPrice && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-forest/70">
                  <span>{t(locale, "price.base")}</span>
                  <span>{cad(shownPrice.base_price)}</span>
                </div>
                <div className="flex justify-between text-forest/70">
                  <span>{t(locale, "price.tax")} ({shownPrice.tax_label})</span>
                  <span>{cad(shownPrice.tax)}</span>
                </div>
                {tipOn && (
                  <div className="flex justify-between text-forest/70">
                    <span>{t(locale, "price.tip")} (15%)</span>
                    <span>{cad(shownPrice.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-sand pt-1.5 text-base font-bold">
                  <span>{t(locale, "price.total")} <span className="text-xs font-medium text-forest/50">({t(locale, "price.taxIncluded")})</span></span>
                  <span className="text-pine">{cad(shownPrice.total)}</span>
                </div>
              </div>
            )}

            {/* Big tip toggle (plan: large toggle, not a checkbox) */}
            <button
              onClick={() => setTipOn((v) => !v)}
              role="switch"
              aria-checked={tipOn}
              className={`flex h-12 w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold ${
                tipOn ? "border-pine bg-pine/10 text-pine" : "border-sand bg-cream text-forest"
              }`}
            >
              <span>{t(locale, "price.tipToggle")}</span>
              <span className={`relative h-6 w-11 rounded-full transition ${tipOn ? "bg-pine" : "bg-sand"}`}>
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${tipOn ? "left-[22px]" : "left-0.5"}`}
                />
              </span>
            </button>

            <Link
              href={`${base}/book/${selected.id}?province=${province}&tip=${tipOn ? 15 : 0}`}
              className="flex h-13 min-h-12 w-full items-center justify-center rounded-full bg-ember text-base font-bold text-white"
            >
              {t(locale, "common.book")} · {shownPrice ? cad(shownPrice.total) : "…"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
