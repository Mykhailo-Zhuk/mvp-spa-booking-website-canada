// US#1 Task 1.3 — booking confirmation + instant payment + success screen
// (QR code, Google Calendar demo, PDF voucher). Client-heavy.
"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { t, type Locale } from "@/lib/i18n";
import { cad, formatDateTime } from "@/lib/format";
import { PROVINCE_LIST } from "@/lib/taxes";
import { DEMO_CARDS, type DemoCard } from "@/lib/demo/payment";
import { downloadIcs } from "@/lib/demo/calendar";
import { generateVoucherPdf } from "@/lib/demo/voucher";

export interface BookingSlotData {
  id: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  price: number;
  originalPrice: number | null;
  isFlashSale: boolean;
  isBooked: boolean;
  therapist: { name: string; avatarEmoji: string; gender: string };
  service: { name: string; slug: string; icon: string; basePrice: number };
}
export interface BookingUserData { id: string; name: string; email: string; province: string }

interface BookResult {
  status: "confirmed" | "failed";
  reason?: string;
  booking: {
    booking_code: string; service: string; start_time: string; therapist: string;
    base_price: number; tax: number; tip: number; total: number; tax_label: string;
  };
}

export default function BookingClient({
  slot,
  user,
  locale,
  base,
  initialProvince,
  initialTip,
}: {
  slot: BookingSlotData;
  user: BookingUserData | null;
  locale: Locale;
  base: string;
  initialProvince: string;
  initialTip: boolean;
}) {
  const [province, setProvince] = useState(initialProvince || user?.province || "ON");
  const [tipOn, setTipOn] = useState(initialTip);
  const [card, setCard] = useState<DemoCard>(DEMO_CARDS[0]);
  const [phase, setPhase] = useState<"confirm" | "paying" | "success" | "failed">("confirm");
  const [result, setResult] = useState<BookResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [addedToCalendar, setAddedToCalendar] = useState(false);
  const [error, setError] = useState<string>("");

  const tax = slot.price * (province === "QC" ? 0.14975 : province === "ON" ? 0.13 : province === "AB" ? 0.05 : 0.12);
  const tipAmount = tipOn ? Math.round(slot.price * 0.15 * 100) / 100 : 0;
  const total = slot.price + Math.round(tax * 100) / 100 + tipAmount;

  const pay = useCallback(async () => {
    if (!user) {
      setError("Please sign in first");
      return;
    }
    setPhase("paying");
    setError("");
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: slot.id,
        userId: user.id,
        province,
        tipPercent: tipOn ? 0.15 : 0,
        cardLast4: card.last4,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Booking failed");
      setPhase("confirm");
      return;
    }
    setResult(data);
    if (data.status === "confirmed") {
      const qr = await QRCode.toDataURL(data.booking.booking_code, { width: 320, margin: 1, color: { dark: "#1f3d2b", light: "#ffffff" } });
      setQrDataUrl(qr);
      setPhase("success");
    } else {
      setPhase("failed");
    }
  }, [slot, user, province, tipOn, card]);

  const addToCalendar = () => {
    downloadIcs({
      title: `Spa: ${result?.booking.service ?? slot.service.name}`,
      description: `Booking ${result?.booking.booking_code} at Rocky Mountain Serenity Spa, Banff.`,
      location: "Rocky Mountain Serenity Spa, 111 Mountain Ave, Banff, AB",
      start: new Date(slot.startTime),
      end: new Date(slot.endTime),
      bookingCode: result?.booking.booking_code,
    });
    setAddedToCalendar(true);
  };

  const downloadVoucher = async () => {
    if (!result) return;
    await generateVoucherPdf({
      bookingCode: result.booking.booking_code,
      spaName: "Rocky Mountain Serenity",
      service: result.booking.service,
      therapist: result.booking.therapist,
      dateTimeLabel: formatDateTime(slot.startTime, locale),
      guestName: user?.name ?? "Guest",
      totalLabel: cad(result.booking.total),
      provinceNote: `Paid: ${cad(result.booking.total)} incl. ${result.booking.tax_label}${result.booking.tip > 0 ? ` + tip ${cad(result.booking.tip)}` : ""}`,
    });
  };

  if (phase === "success" && result) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-3xl bg-pine px-6 py-8 text-center text-white">
          <div className="text-5xl">✅</div>
          <h1 className="mt-3 text-xl font-bold">{t(locale, "book.success")}</h1>
          <p className="mt-1 text-sm text-white/70">{t(locale, "book.demoSuccess")}</p>
        </div>

        <div className="rounded-2xl border border-sand bg-white p-5">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- QR is a runtime data-URI */}
            <img src={qrDataUrl} alt="QR" className="mx-auto h-40 w-40 rounded-xl" />
            <p className="mt-2 text-xs text-forest/60">{t(locale, "book.qrHint")}</p>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-forest/60">{t(locale, "book.code")}</span><b>{result.booking.booking_code}</b></div>
            <div className="flex justify-between"><span className="text-forest/60">{t(locale, "book.service")}</span><b>{result.booking.service}</b></div>
            <div className="flex justify-between"><span className="text-forest/60">{t(locale, "book.therapist")}</span><b>{result.booking.therapist}</b></div>
            <div className="flex justify-between"><span className="text-forest/60">{t(locale, "book.dateTime")}</span><b>{formatDateTime(slot.startTime, locale)}</b></div>
            <div className="flex justify-between"><span className="text-forest/60">{t(locale, "price.total")}</span><b>{cad(result.booking.total)}</b></div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={addToCalendar}
            className="flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest text-sm font-bold text-cream"
          >
            {addedToCalendar ? t(locale, "book.addedToCalendar") : `📅 ${t(locale, "book.addToCalendar")}`}
          </button>
          <button
            onClick={downloadVoucher}
            className="flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-forest ring-1 ring-sand"
          >
            🎫 {t(locale, "book.downloadVoucher")}
          </button>
          <Link
            href={`${base}/bookings`}
            className="flex h-13 min-h-12 w-full items-center justify-center rounded-full bg-pine text-sm font-bold text-white"
          >
            {t(locale, "book.seeBookings")} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">{t(locale, "book.confirm")}</h1>

      {/* Summary */}
      <div className="rounded-2xl border border-sand bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sand text-3xl">{slot.service.icon}</span>
          <div>
            <div className="text-base font-bold">{slot.service.name}</div>
            <div className="text-xs text-forest/60">{slot.therapist.avatarEmoji} {slot.therapist.name}</div>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-forest/60">{t(locale, "book.dateTime")}</span><b>{formatDateTime(slot.startTime, locale)}</b></div>
          <div className="flex justify-between"><span className="text-forest/60">{t(locale, "book.duration")}</span><b>{slot.durationMin} min</b></div>
          <div className="flex justify-between"><span className="text-forest/60">{t(locale, "book.contact")}</span><b>{user?.name ?? "—"}</b></div>
        </div>
        {slot.isFlashSale && slot.originalPrice && (
          <div className="mt-3 rounded-xl bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">
            🔥 {t(locale, "catalog.freeSlots")}: {cad(slot.originalPrice)} → {cad(slot.price)}
          </div>
        )}
      </div>

      {/* Province + tip */}
      <div className="space-y-2 rounded-2xl border border-sand bg-white p-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-forest/50">{t(locale, "price.province")}</label>
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="h-11 w-full rounded-xl border border-sand bg-cream px-3 text-sm font-medium"
        >
          {PROVINCE_LIST.map((p) => (
            <option key={p.code} value={p.code}>{p.name} — {p.label}</option>
          ))}
        </select>
        <button
          onClick={() => setTipOn((v) => !v)}
          role="switch"
          aria-checked={tipOn}
          className={`flex h-12 w-full items-center justify-between rounded-xl border px-3 text-sm font-semibold ${
            tipOn ? "border-pine bg-pine/10 text-pine" : "border-sand bg-cream"
          }`}
        >
          <span>{t(locale, "price.tipToggle")}</span>
          <span className={`relative h-6 w-11 rounded-full transition ${tipOn ? "bg-pine" : "bg-sand"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${tipOn ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </button>
      </div>

      {/* Price breakdown */}
      <div className="space-y-1.5 rounded-2xl border border-sand bg-white p-4 text-sm">
        <div className="flex justify-between text-forest/70">
          <span>{t(locale, "price.base")}</span><span>{cad(slot.price)}</span>
        </div>
        <div className="flex justify-between text-forest/70">
          <span>{t(locale, "price.tax")} ({province === "QC" ? "GST+QST" : province === "ON" ? "HST 13%" : province === "AB" ? "GST 5%" : "GST+PST"})</span>
          <span>{cad(Math.round(tax * 100) / 100)}</span>
        </div>
        {tipOn && (
          <div className="flex justify-between text-forest/70">
            <span>{t(locale, "price.tip")} (15%)</span><span>{cad(tipAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-sand pt-2 text-base font-bold">
          <span>{t(locale, "price.total")}</span><span className="text-pine">{cad(total)}</span>
        </div>
      </div>

      {/* Payment method (demo Stripe sheet) */}
      <div className="rounded-2xl border border-sand bg-white p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">{t(locale, "book.payWith")}</div>
        <div className="space-y-2">
          {DEMO_CARDS.map((c) => (
            <button
              key={c.last4}
              onClick={() => setCard(c)}
              className={`flex h-12 w-full items-center gap-2 rounded-xl border px-3 text-sm font-medium ${
                card.last4 === c.last4 ? "border-pine bg-pine/10" : "border-sand bg-cream"
              }`}
            >
              <span className="text-lg">{c.emoji || "🍏"}</span> {c.label}
              {card.last4 === c.last4 && <span className="ml-auto text-pine">●</span>}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-forest/50">{t(locale, "book.demoPay")}</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {phase === "failed" && result && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {t(locale, "book.paymentFailed")} <span className="text-xs">({result.reason})</span>
        </div>
      )}

      <button
        onClick={pay}
        disabled={phase === "paying"}
        className="flex h-14 w-full items-center justify-center rounded-full bg-ember text-base font-bold text-white disabled:opacity-60"
      >
        {phase === "paying" ? (
          <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> {t(locale, "book.paying")}</span>
        ) : (
          `${t(locale, "common.payNow")} · ${cad(total)}`
        )}
      </button>
      <p className="text-center text-[11px] text-forest/50">
        Demo payment — simulated Stripe Payment Sheet. Use card •••• 0002 to test a bank decline.
      </p>
    </div>
  );
}
