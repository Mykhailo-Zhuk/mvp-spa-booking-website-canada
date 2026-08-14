"use client";

// US#2 Task 2.2 — "What's included" grid with icons + tap-for-details tooltip.
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export interface Inclusion {
  id: string;
  icon: string;
  name: string; // already localized
  tooltip: string;
}

export default function InclusionsGrid({ items, locale }: { items: Inclusion[]; locale: Locale }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-forest">✅ {t(locale, "pkg.whatIncluded")}</h2>
        <span className="text-[11px] text-forest/50">{t(locale, "pkg.tapForDetails")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setOpenId(openId === it.id ? null : it.id)}
            className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-sand bg-white p-2 text-center transition hover:border-pine/40"
          >
            <span className="text-3xl">{it.icon}</span>
            <span className="text-[11px] font-semibold leading-tight text-forest">{it.name}</span>
          </button>
        ))}
      </div>

      {/* Tooltip / modal */}
      {openId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpenId(null)}>
          <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const item = items.find((i) => i.id === openId);
              if (!item) return null;
              return (
                <>
                  <div className="text-center text-4xl">{item.icon}</div>
                  <h3 className="mt-2 text-center text-base font-bold text-forest">{item.name}</h3>
                  <p className="mt-2 text-center text-sm text-forest/70">{item.tooltip}</p>
                  <button
                    onClick={() => setOpenId(null)}
                    className="mt-4 h-12 w-full rounded-full bg-forest text-sm font-bold text-cream"
                  >
                    {t(locale, "common.close")}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
