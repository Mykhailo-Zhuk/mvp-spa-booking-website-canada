"use client";

// US#3 Task 3.1 — horizontal step-by-step carousel "from entrance to exit".
// Tap a step → bottom sheet with full details (plan acceptance criteria).
import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export interface GuideStep {
  id: string;
  stepNumber: number;
  icon: string;
  title: string;
  description: string;
  estimatedDurationMin: number | null;
}

export default function GuestGuide({ serviceId, locale }: { serviceId: string; locale: Locale }) {
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<GuideStep | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/guest-guide/${serviceId}`)
      .then((r) => r.json())
      .then((d) => setSteps(d.steps ?? []))
      .catch(() => {});
  }, [serviceId]);

  if (steps.length === 0) return null;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (el.clientWidth * 0.8));
    setActive(Math.min(Math.max(idx, 0), steps.length - 1));
  };

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide text-forest">🧭 {t(locale, "guide.title")}</h2>
      <p className="mb-3 text-xs text-forest/60">{t(locale, "guide.subtitle")}</p>

      {/* Carousel */}
      <div ref={trackRef} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setDetail(s)}
            className={`flex min-h-40 w-44 shrink-0 snap-center flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition ${
              i === active ? "border-pine bg-pine/10" : "border-sand bg-white"
            }`}
          >
            <span className="text-4xl">{s.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-ember">
              {t(locale, "guide.step")} {s.stepNumber}
            </span>
            <span className="text-sm font-bold leading-tight text-forest">{s.title}</span>
            <span className="text-[11px] text-forest/50">
              {s.estimatedDurationMin ? `~${s.estimatedDurationMin} min` : ""}
            </span>
          </button>
        ))}
      </div>

      {/* Pagination dots (plan: ● ○ ○ ○ ○) */}
      <div className="mt-2 flex justify-center gap-1.5">
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-pine" : "w-2 bg-sand"}`}
          />
        ))}
      </div>

      {/* Bottom sheet with step details */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-sand" />
            <div className="text-center text-5xl">{detail.icon}</div>
            <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wide text-ember">
              {t(locale, "guide.step")} {detail.stepNumber}
              {detail.estimatedDurationMin ? ` · ~${detail.estimatedDurationMin} min` : ""}
            </p>
            <h3 className="mt-1 text-center text-lg font-bold text-forest">{detail.title}</h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-forest/75">{detail.description}</p>
            <button
              onClick={() => setDetail(null)}
              className="mt-5 h-12 w-full rounded-full bg-forest text-sm font-bold text-cream"
            >
              {t(locale, "common.close")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
