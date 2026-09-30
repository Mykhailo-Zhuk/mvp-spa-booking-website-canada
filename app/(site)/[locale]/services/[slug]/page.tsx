// US#3 (Прія) — service detail: newbie badge + step-by-step guest guide + FAQ.
import Link from "next/link";
import { notFound } from "next/navigation";
import GuestGuide from "@/components/guest-guide";
import FaqAccordion from "@/components/faq-accordion";
import NewbieBadge from "@/components/newbie-badge";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { t, tri, type Locale } from "@/lib/i18n";
import { cad } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const base = `/${locale}`;

  const service = await prisma.service.findUnique({ where: { slug } });
  if (!service) notFound();

  const user = await getCurrentUser();
  const isNewbie = !!user && user.totalBookingsCount === 0;
  return (
    <div className="space-y-6">
      <Link
        href={`${base}/services`}
        className="group inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-pine transition hover:text-forest"
      >
        <svg
          className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span>{t(locale, "common.back")}</span>
      </Link>

      {/* Hero */}
      <section className="rounded-3xl bg-forest px-6 py-8 text-cream">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-cream/10 text-4xl">{service.icon}</span>
          <div>
            <h1 className="text-2xl font-bold">{tri(service.nameEn, service.nameFr, service.nameUk, locale)}</h1>
            <p className="mt-1 text-sm text-cream/70">
              {service.durationMin} min · {cad(service.basePrice)} <span className="text-cream/40">+ taxes</span>
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-cream/85">{tri(service.descriptionEn, service.descriptionFr, service.descriptionUk, locale)}</p>
      </section>

      {/* Newbie badge (US#3 Task 3.3) */}
      {isNewbie ? (
        <NewbieBadge locale={locale} />
      ) : (
        user && (
          <div className="rounded-2xl border border-sand bg-white px-4 py-3 text-sm font-semibold text-forest">
            👋 {t(locale, "guide.welcomeBack")} {user.name.split(" ")[0]}!
          </div>
        )
      )}

      {/* Guest guide carousel (Task 3.1) */}
      <div id="guest-guide" className="scroll-mt-20">
        <GuestGuide serviceId={service.id} locale={locale} />
      </div>

      {/* FAQ (Task 3.2) */}
      <FaqAccordion serviceId={service.id} locale={locale} />

      {/* Book CTA — goes to catalog with this service preselected */}
      <Link
        href={`${base}/services?service=${service.id}`}
        className="flex h-14 items-center justify-center rounded-full bg-ember text-base font-bold text-white"
      >
        {t(locale, "common.book")} {tri(service.nameEn, service.nameFr, service.nameUk, locale)} →
      </Link>
    </div>
  );
}
