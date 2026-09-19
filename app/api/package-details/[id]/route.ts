import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// US#2 Task 2.2 — /api/package-details/:id (aggregates package + inclusions).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const pkg = await prisma.package.findUnique({ where: { id }, include: { inclusions: true } });
  if (!pkg) return NextResponse.json({ error: "package not found" }, { status: 404 });

  return NextResponse.json({
    id: pkg.id,
    slug: pkg.slug,
    title_en: pkg.titleEn,
    title_fr: pkg.titleFr,
    title_uk: pkg.titleUk,
    description_en: pkg.descriptionEn,
    description_fr: pkg.descriptionFr,
    description_uk: pkg.descriptionUk,
    price: pkg.price,
    duration_min: pkg.durationMin,
    inclusions: pkg.inclusions.map((i) => ({
      id: i.id,
      item_name_en: i.itemNameEn,
      item_name_fr: i.itemNameFr,
      item_name_uk: i.itemNameUk,
      icon: i.icon,
      tooltip: i.tooltip,
    })),
  });
}
