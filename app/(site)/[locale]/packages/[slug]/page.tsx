// US#2 (Девід) — package page: bilingual EN/FR content from DB (Task 2.1) +
// included-items grid with tooltips (Task 2.2) + voucher entry (Task 2.3).
import Link from "next/link";
import { notFound } from "next/navigation";
import InclusionsGrid from "@/components/inclusions-grid";
import { prisma } from "@/lib/prisma";
import { t, dbText, type Locale } from "@/lib/i18n";
import { cad, formatDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PackagePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const base = `/${locale}`;

  const pkg = await prisma.package.findUnique({
    where: { slug },
    include: { inclusions: true },
  });
  if (!pkg) notFound();

  // A real package service row exists (seed) → find first free slot for the Book CTA.
  const pkgService = await prisma.service.findUnique({ where: { slug: `pkg-${pkg.slug}` } });
  const firstSlot = pkgService
    ? await prisma.slot.findFirst({
        where: { serviceId: pkgService.id, isBooked: false, startTime: { gte: new Date() } },
        include: { therapist: true },
        orderBy: { startTime: "asc" },
      })
    : null;

  const title = dbText(pkg.titleFr, pkg.titleEn, locale);
  const description = dbText(pkg.descriptionFr, pkg.descriptionEn, locale);
  const inclusions = pkg.inclusions.map((i) => ({
    id: i.id,
    icon: i.icon,
    name: dbText(i.itemNameFr, i.itemNameEn, locale),
    tooltip: i.tooltip, // English tooltips (demo keeps tooltips EN)
  }));

  return (
    <div className="space-y-5">
      <Link href={base} className="text-sm font-semibold text-pine">
        ← {t(locale, "common.back")}
      </Link>

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-forest px-6 py-8 text-cream">
        <div className="flex items-center gap-4">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-cream/10 text-5xl">{pkg.imageEmoji}</span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-moss">Quebec City · Winter</p>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-cream/70">{pkg.durationMin} min · {cad(pkg.price)}</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-cream/85">{description}</p>
        {locale === "fr" && (
          <p className="mt-2 text-[11px] text-cream/50">Traduction approuvée par le spa — pas de traduction automatique.</p>
        )}
      </section>

      {/* Inclusions (Task 2.2) */}
      <InclusionsGrid items={inclusions} locale={locale} />

      {/* Green banner — plan acceptance: "✅ Включено: 2 халати, безкоштовний паркінг, чай з імбиром" */}
      <div className="rounded-2xl border-2 border-moss bg-moss/10 px-4 py-3 text-sm font-semibold text-forest">
        ✅ {t(locale, "pkg.ecoGreen")}
        {inclusions
          .filter((i) => ["👘", "🚗", "🍵"].includes(i.icon))
          .map((i) => i.name)
          .join(" · ")}
      </div>

      {/* Paid separately — plan: David hates hidden extras */}
      <div className="rounded-2xl border border-ember/30 bg-ember/5 px-4 py-3 text-sm text-forest/80">
        <span className="font-semibold text-ember">💡 {t(locale, "common.notIncluded")}:</span> {t(locale, "pkg.notIncludedNote")}
      </div>

      {/* Book CTA (flows into US#1 booking + US#2 voucher) */}
      {firstSlot ? (
        <Link
          href={`${base}/book/${firstSlot.id}`}
          className="flex h-14 items-center justify-center rounded-full bg-ember text-base font-bold text-white"
        >
          {t(locale, "common.book")} · {cad(pkg.price)} — {formatDate(firstSlot.startTime, locale)}, {formatTime(firstSlot.startTime)}
        </Link>
      ) : (
        <p className="text-center text-sm text-forest/50">{t(locale, "catalog.noSlots")}</p>
      )}
    </div>
  );
}
