"use client";

// US#3 Task 3.1 — horizontal step-by-step carousel "from entrance to exit".
// Tap a step → bottom sheet with full details (plan acceptance criteria).
import { useEffect, useRef, useState, useCallback } from "react";
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
  const [canScroll, setCanScroll] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const checkScrollable = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const isScrollable = el.scrollWidth > el.clientWidth + 2;
    setCanScroll(isScrollable);
  }, []);

  const updateActiveIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    const cards = el.querySelectorAll<HTMLElement>("[data-step-card]");
    if (cards.length === 0) return;

    const containerCenter = el.scrollLeft + el.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, idx) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    setActive(closestIndex);
  }, []);

  const onScroll = () => {
    updateActiveIndex();
  };

  const scrollToStep = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-step-card]");
    if (cards[index]) {
      const card = cards[index];
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const containerWidth = el.clientWidth;
      const targetScroll = cardLeft - (containerWidth - cardWidth) / 2;
      el.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
      setActive(index);
    }
  };

  const scrollPrev = () => {
    scrollToStep(Math.max(0, active - 1));
  };

  const scrollNext = () => {
    scrollToStep(Math.min(steps.length - 1, active + 1));
  };

  useEffect(() => {
    fetch(`/api/guest-guide/${serviceId}?locale=${locale}`)
      .then((r) => r.json())
      .then((d) => {
        const loadedSteps = d.steps ?? [];
        setSteps(loadedSteps);
        if (loadedSteps.length > 0 && typeof window !== "undefined" && window.location.hash === "#guest-guide") {
          setTimeout(() => {
            document.getElementById("guest-guide")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 60);
        }
      })
      .catch(() => {});
  }, [serviceId, locale]);

  useEffect(() => {
    if (steps.length === 0) return;

    checkScrollable();
    updateActiveIndex();

    const el = trackRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && el) {
      resizeObserver = new ResizeObserver(() => {
        checkScrollable();
        updateActiveIndex();
      });
      resizeObserver.observe(el);
    }

    const handleResize = () => {
      checkScrollable();
      updateActiveIndex();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver && el) resizeObserver.unobserve(el);
    };
  }, [steps, checkScrollable, updateActiveIndex]);

  if (steps.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide text-forest">🧭 {t(locale, "guide.title")}</h2>
      <p className="mb-3 text-xs text-forest/60">{t(locale, "guide.subtitle")}</p>

      {/* Carousel Track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth"
      >
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            data-step-card
            onClick={() => setDetail(s)}
            className={`flex min-h-40 w-44 shrink-0 snap-center flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition cursor-pointer ${
              i === active ? "border-pine bg-pine/10 ring-2 ring-pine/20" : "border-sand bg-white hover:border-pine/30"
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

      {/* Carousel navigation & pagination buttons (only shown if items do not fit container width) */}
      {canScroll && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={active === 0}
            aria-label="Previous step"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-sand bg-white text-forest shadow-xs transition hover:border-pine hover:bg-cream disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 px-1">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToStep(i)}
                aria-label={`${t(locale, "guide.step")} ${s.stepNumber}`}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  i === active ? "w-6 bg-pine" : "w-2.5 bg-sand hover:bg-pine/50"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={scrollNext}
            disabled={active === steps.length - 1}
            aria-label="Next step"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-sand bg-white text-forest shadow-xs transition hover:border-pine hover:bg-cream disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Step details modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-forest/40 backdrop-blur-sm" />
          <div
            className="relative top-[20%] w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
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
              className="mt-5 h-12 w-full rounded-full bg-forest text-sm font-bold text-cream cursor-pointer"
            >
              {t(locale, "common.close")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
