"use client";

// "My bookings" list with PDF voucher re-download (US#2 Task 2.3 usable offline).
import { useEffect, useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { cad, formatDateTime } from "@/lib/format";
import { generateVoucherPdf } from "@/lib/demo/voucher";

interface BookingRow {
  id: string; bookingCode: string; status: string; createdAt: string;
  service: string; serviceIcon: string; therapist: string; therapistEmoji: string;
  startTime: string; endTime: string; basePrice: number; taxAmount: number; tipAmount: number;
  totalPaid: number; taxRate: number;
}

export default function BookingsList({ userId, locale }: { userId: string; locale: Locale }) {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bookings?userId=${userId}&locale=${locale}`)
      .then((r) => r.json())
      .then((d) => setRows(d.bookings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, locale]);

  const download = async (b: BookingRow) => {
    await generateVoucherPdf({
      bookingCode: b.bookingCode,
      spaName: "Rocky Mountain Serenity",
      service: b.service,
      therapist: b.therapist,
      dateTimeLabel: formatDateTime(b.startTime, locale),
      guestName: "Guest",
      totalLabel: cad(b.totalPaid),
      provinceNote: `Paid ${cad(b.totalPaid)} incl. ${(b.taxRate * 100).toFixed(1)}% tax${b.tipAmount > 0 ? ` + tip ${cad(b.tipAmount)}` : ""}`,
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">📅 {t(locale, "nav.bookings")}</h1>
      {loading ? (
        <div className="flex h-32 items-center justify-center text-forest/50"><span className="animate-spin text-2xl">⏳</span></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-sand bg-white px-4 py-10 text-center text-sm text-forest/60">
          {t(locale, "book.noBookings")} — <Link href={`/${locale}/services`} className="text-pine underline">{t(locale, "book.findTreatment")}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="rounded-2xl border border-sand bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sand text-2xl">{b.serviceIcon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-forest">{b.service}</div>
                  <div className="text-xs text-forest/60">{b.therapistEmoji} {b.therapist} · {formatDateTime(b.startTime, locale)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-pine">{cad(b.totalPaid)}</div>
                  <div className={`text-[11px] font-semibold ${b.status === "confirmed" ? "text-moss" : "text-ember"}`}>{b.status}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-sand/60 pt-3">
                <span className="text-[11px] font-mono text-forest/50">{b.bookingCode}</span>
                <div className="flex gap-2">
                  <button onClick={() => download(b)} className="h-10 rounded-full bg-forest px-4 text-xs font-bold text-cream">
                    🎫 {t(locale, "book.downloadVoucher")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
