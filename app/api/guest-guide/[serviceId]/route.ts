import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tri, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// US#3 Task 3.1 — /api/guest-guide/:serviceId?locale=
export async function GET(req: Request, ctx: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await ctx.params;
  const locale = (new URL(req.url).searchParams.get("locale") ?? "en") as Locale;
  const steps = await prisma.guestGuideStep.findMany({
    where: { serviceId },
    orderBy: { stepNumber: "asc" },
  });
  if (steps.length === 0) {
    return NextResponse.json({ steps: [], serviceName: null });
  }
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { nameEn: true, nameFr: true, nameUk: true } });
  return NextResponse.json({
    steps: steps.map((s) => ({
      id: s.id,
      stepNumber: s.stepNumber,
      icon: s.icon,
      title: tri(s.titleEn, s.titleFr, s.titleUk, locale),
      description: tri(s.descriptionEn, s.descriptionFr, s.descriptionUk, locale),
      estimatedDurationMin: s.estimatedDurationMin,
    })),
    serviceName: service ? tri(service.nameEn, service.nameFr, service.nameUk, locale) : null,
  });
}
