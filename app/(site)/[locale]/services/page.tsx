import CatalogClient from "@/components/catalog-client";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const base = `/${locale}`;

  const services = await prisma.service.findMany({
    select: { id: true, name: true, icon: true, slug: true },
    orderBy: { basePrice: "asc" },
  });

  return <CatalogClient locale={locale} base={base} services={services} />;
}
