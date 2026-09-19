"use client";

// US#3 Task 3.2 — FAQ accordion with popularity analytics (+1 view_count on expand).
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  viewCount: number;
  helpfulCount: number;
  popularityScore: number;
}

export default function FaqAccordion({ serviceId, locale }: { serviceId: string; locale: Locale }) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/faq/${serviceId}?locale=${locale}`)
      .then((r) => r.json())
      .then((d) => setFaqs(d.faqs ?? []))
      .catch(() => {});
  }, [serviceId, locale]);

  if (faqs.length === 0) return null;

  const toggle = async (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next) {
      // Analytics: count the expansion (plan Task 3.2)
      fetch(`/api/faq/${id}/view`, { method: "POST" }).catch(() => {});
      setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, viewCount: f.viewCount + 1 } : f)));
    }
  };

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide text-forest">❓ {t(locale, "guide.faq")}</h2>
      <div className="mt-2 space-y-2">
        {faqs.map((f) => (
          <div key={f.id} className="overflow-hidden rounded-2xl border border-sand bg-white">
            <button
              onClick={() => toggle(f.id)}
              className="flex min-h-12 w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-forest"
            >
              <span>{f.question}</span>
              <span className={`text-pine transition-transform ${openId === f.id ? "rotate-180" : ""}`}>▾</span>
            </button>
            <div
              className={`grid transition-all duration-300 ${openId === f.id ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="border-t border-sand/60 bg-cream/50 px-4 py-3 text-sm leading-relaxed text-forest/75">
                  {f.answer}
                </p>
                <p className="px-4 pb-2 text-[10px] text-forest/40">
                  👍 {f.helpfulCount} helpful · 👀 {f.viewCount} views
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
