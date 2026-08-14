import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { t, type Locale } from "@/lib/i18n";
import { cad, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const base = `/${locale}`;

  const [services, packages, user, nextSlots] = await Promise.all([
    prisma.service.findMany({ orderBy: { basePrice: "asc" } }),
    prisma.package.findMany({ take: 2 }),
    getCurrentUser(),
    prisma.slot.findMany({
      where: { isBooked: false, startTime: { gte: new Date() } },
      include: { service: true, therapist: true },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
  ]);

  const isNewbie = !!user && user.totalBookingsCount === 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-forest px-6 py-10 text-cream">
        <div className="absolute -right-8 -top-8 text-[120px] opacity-20">🏔️</div>
        <p className="text-xs font-semibold uppercase tracking-widest text-moss">Banff · Alberta · Canada</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight">{t(locale, "home.hero.title")}</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-cream/80">{t(locale, "home.hero.subtitle")}</p>
        <Link
          href={`${base}/services`}
          className="mt-6 inline-flex h-12 items-center rounded-full bg-ember px-6 text-sm font-bold text-white"
        >
          {t(locale, "home.hero.cta")} →
        </Link>
        {/* Next available slots ticker */}
        {nextSlots.length > 0 && (
          <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar">
            {nextSlots.map((s) => (
              <Link
                key={s.id}
                href={`${base}/services/${s.service.slug}?slot=${s.id}`}
                className="shrink-0 rounded-2xl border border-cream/20 bg-cream/10 px-3 py-2 text-xs"
              >
                <span className="font-bold">{formatTime(s.startTime)}</span>
                <span className="ml-1 text-cream/70">{s.service.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Newbie banner (US#3) */}
      {isNewbie && (
        <Link
          href={`${base}/services/smudge-ceremony`}
          className="block rounded-2xl border-2 border-gold bg-gold/10 px-4 py-3 text-sm font-semibold text-forest"
        >
          {t(locale, "guide.newbieBadge")} <span className="text-pine underline">{t(locale, "guide.seeGuide")} →</span>
        </Link>
      )}

      {/* Popular services (US#1 entry) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t(locale, "home.popular")}</h2>
          <Link href={`${base}/services`} className="text-sm font-semibold text-pine">
            {t(locale, "common.seeAll")} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {services.map((s) => (
            <Link
              key={s.id}
              href={`${base}/services/${s.slug}`}
              className="rounded-2xl border border-sand bg-white p-4 transition hover:border-pine/40"
            >
              <div className="text-3xl">{s.icon}</div>
              <div className="mt-2 text-sm font-bold leading-tight">{s.name}</div>
              <div className="mt-1 text-xs text-forest/60">
                {s.durationMin} min · {cad(s.basePrice)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Packages (US#2) */}
      <section>
        <h2 className="mb-3 text-lg font-bold">{t(locale, "home.packages")}</h2>
        <div className="space-y-3">
          {packages.map((p) => (
            <Link
              key={p.id}
              href={`${base}/packages/${p.slug}`}
              className="flex items-center gap-4 rounded-2xl border border-sand bg-white p-4 transition hover:border-pine/40"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sand text-3xl">{p.imageEmoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {locale === "fr" ? p.titleFr : p.titleEn}
                </div>
                <div className="mt-0.5 text-xs text-forest/60">
                  {locale === "fr" ? p.descriptionFr.slice(0, 80) : p.descriptionEn.slice(0, 80)}…
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-pine">{cad(p.price)}</div>
                <div className="text-[11px] text-forest/50">{t(locale, "pkg.duration")} {p.durationMin}m</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
