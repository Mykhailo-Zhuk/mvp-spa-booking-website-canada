"use client";

// US#4 (Софія) — admin dashboard: burning slots, one-click flash sale with slider,
// delivery stats, active promos with live countdown.
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { cad } from "@/lib/format";

interface HotSlot {
  id: string; startTime: string; startLabel: string; dayLabel: string; weekday: number; hour: number;
  fillRate: number; price: number; originalPrice: number | null; isFlashSale: boolean;
  service: { name: string; icon: string }; therapist: { name: string; avatarEmoji: string };
}
interface ActivePromo { id: string; discountPercent: number; originalPrice: number; discountedPrice: number; endTime: string; service: string }
interface Stats {
  revenue_today_label: string; flash_revenue_today: number; active_promos: ActivePromo[];
  delivery: { push_delivered: number; sms_delivered: number; total: number };
}
interface DeliveryRes { targeted: number; push_delivered: number; sms_delivered: number; failed: number }

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATIONS = [1, 2, 4, 8];

export default function AdminDashboard({ locale }: { locale: Locale }) {
  const [hot, setHot] = useState<HotSlot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalSlot, setModalSlot] = useState<HotSlot | null>(null);
  const [percent, setPercent] = useState(20);
  const [hours, setHours] = useState(2);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [now, setNow] = useState(0);

  const loadData = () =>
    Promise.all([
      fetch("/api/admin/hot-slots").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
    ]).then(([h, s]) => {
      setHot(h.hot_slots ?? []);
      setStats(s);
    });

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then(() => { if (!cancelled) setLoading(false); })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ignite = async () => {
    if (!modalSlot) return;
    setBusy(true);
    const res = await fetch("/api/admin/create-flash-sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: modalSlot.id, discountPercent: percent, durationHours: hours }),
    });
    const data = await res.json();
    setBusy(false);
    setModalSlot(null);
    if (res.ok) {
      const d: DeliveryRes = data.notification_delivery ?? {};
      setToast(
        `✅ Flash sale live: ${cad(data.discounted_price)} (was ${cad(data.original_price)}). ` +
        `Push: ${d.push_delivered ?? 0}, SMS: ${d.sms_delivered ?? 0}, targeted: ${d.targeted ?? 0}`
      );
      refresh();
    } else {
      setToast(`❌ ${data.error ?? "Failed"}`);
    }
    setTimeout(() => setToast(""), 6000);
  };

  const refresh = () => loadData().catch(() => {});

  const newPrice = modalSlot ? Math.round((modalSlot.price * (1 - percent / 100)) * 100) / 100 : 0;
  const risk = modalSlot ? modalSlot.price - newPrice : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">👑 {t(locale, "admin.title")}</h1>
        <p className="text-sm text-forest/60">Sofia Dubois · Rocky Mountain Serenity, Banff</p>
      </div>

      {/* Widget cards (mobile-first dashboard) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-sand bg-white p-3 text-center">
          <div className="text-2xl font-bold text-ember">{hot.length}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest/50">🔥 {t(locale, "admin.hotSlots")}</div>
        </div>
        <div className="rounded-2xl border border-sand bg-white p-3 text-center">
          <div className="text-2xl font-bold text-pine">{stats?.active_promos.length ?? "…"}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest/50">⚡ {t(locale, "admin.activePromos")}</div>
        </div>
        <div className="rounded-2xl border border-sand bg-white p-3 text-center">
          <div className="text-2xl font-bold text-forest">{stats?.revenue_today_label ?? "…"}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest/50">💰 {t(locale, "admin.revenueToday")}</div>
        </div>
      </div>

      {/* Hot slots */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-forest">{t(locale, "admin.hotSlots")}</h2>
        <p className="mb-2 text-xs text-forest/60">{t(locale, "admin.hotSlotsSub")} {t(locale, "admin.last7")}.</p>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-forest/50"><span className="animate-spin text-2xl">⏳</span></div>
        ) : hot.length === 0 ? (
          <div className="rounded-2xl border border-sand bg-white px-4 py-8 text-center text-sm text-forest/60">{t(locale, "admin.noHot")}</div>
        ) : (
          <div className="space-y-2">
            {hot.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border-l-4 border-[#FF4444] bg-white p-3">
                <span className="text-2xl">{s.therapist.avatarEmoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-forest">
                    {WEEKDAYS_EN[s.weekday]} {s.dayLabel.slice(5)} · {s.startLabel}
                  </div>
                  <div className="truncate text-xs text-forest/60">
                    {s.service.icon} {s.service.name} · {s.therapist.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#FF4444]">{t(locale, "admin.fillRate")}: {Math.round(s.fillRate * 100)}%</span>
                    {s.isFlashSale && s.originalPrice && (
                      <span className="text-xs text-ember">🔥 {cad(s.originalPrice)} → {cad(s.price)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setModalSlot(s); setPercent(20); setHours(2); }}
                  className="h-11 shrink-0 rounded-full bg-ember px-4 text-xs font-bold text-white"
                >
                  🔥 {t(locale, "admin.flash")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active promos with countdown */}
      {stats && stats.active_promos.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-forest">⚡ {t(locale, "admin.activePromos")}</h2>
          <div className="space-y-2">
            {stats.active_promos.map((p) => {
              const leftMs = new Date(p.endTime).getTime() - now;
              const left = leftMs > 0 ? `${Math.floor(leftMs / 60000)}m` : t(locale, "admin.deactivated");
              return (
                <div key={p.id} className="flex items-center justify-between rounded-2xl border border-gold bg-gold/10 px-4 py-3 text-sm">
                  <span className="font-semibold text-forest">{p.service} · −{p.discountPercent}%</span>
                  <span className="text-xs font-bold text-ember">{cad(p.originalPrice)} → {cad(p.discountedPrice)}</span>
                  <span className="text-xs text-forest/60">⏱ {left}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Delivery stats */}
      {stats && (
        <section className="rounded-2xl border border-sand bg-white p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-forest">📣 {t(locale, "admin.delivery")}</h2>
          <p className="mt-1 text-sm text-forest/75">
            🔔 Push: <b>{stats.delivery.push_delivered}</b> · 💬 SMS: <b>{stats.delivery.sms_delivered}</b> · 🧾 {t(locale, "admin.delivered")}: <b>{stats.delivery.total}</b>
          </p>
          <p className="mt-1 text-[11px] text-forest/50">
            Demo: Firebase push simulated, Twilio SMS fallback for offline tokens (plan fallback), in-app banners duplicated.
          </p>
        </section>
      )}

      {/* Flash-sale modal (plan Task 4.2: slider 5–50% + duration) */}
      {modalSlot && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setModalSlot(null)}>
          <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-forest">🔥 {t(locale, "admin.flashModal")}</h2>
            <p className="mt-1 text-sm text-forest/60">
              {WEEKDAYS_EN[modalSlot.weekday]} {modalSlot.dayLabel.slice(5)} · {modalSlot.startLabel} — {modalSlot.service.name} ({cad(modalSlot.price)})
            </p>

            <div className="mt-4">
              <div className="flex justify-between text-sm font-semibold">
                <span>{t(locale, "admin.discount")}: {percent}%</span>
                <span className="text-ember">{t(locale, "admin.newPrice")}: {cad(newPrice)}</span>
              </div>
              <input
                type="range" min={5} max={50} step={5} value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-sand accent-ember"
              />
              <div className="mt-1 flex justify-between text-[10px] text-forest/50"><span>5%</span><span>50%</span></div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold">{t(locale, "admin.duration")}</div>
              <div className="mt-2 flex gap-2">
                {DURATIONS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHours(h)}
                    className={`h-10 flex-1 rounded-full text-sm font-semibold ${hours === h ? "bg-pine text-white" : "bg-sand text-forest"}`}
                  >
                    {h} {t(locale, "admin.hours")}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-cream px-3 py-2 text-xs text-forest/70">
              ⚠️ {t(locale, "admin.risk")}: <b className="text-ember">{cad(risk)}</b> · {t(locale, "admin.perSlot")} — high probability of filling
            </div>

            <button
              onClick={ignite}
              disabled={busy}
              className="mt-4 flex h-13 min-h-12 w-full items-center justify-center rounded-full bg-ember text-base font-bold text-white disabled:opacity-60"
            >
              {busy ? "⏳ Sending…" : `🔥 ${t(locale, "admin.activate")} −${percent}%`}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl bg-forest px-4 py-3 text-center text-sm font-semibold text-cream shadow-xl md:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}
