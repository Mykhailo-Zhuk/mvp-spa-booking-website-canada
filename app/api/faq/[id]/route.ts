import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tri, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// US#3 Task 3.2 — /api/faq/:id (id = serviceId; sorted by popularity_score → view_count)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: serviceId } = await ctx.params;
  const locale = (new URL(req.url).searchParams.get("locale") ?? "en") as Locale;
  const faqs = await prisma.faq.findMany({
    where: { serviceId },
    orderBy: [{ viewCount: "desc" }, { helpfulCount: "desc" }],
  });
  return NextResponse.json({
    faqs: faqs.map((f) => ({
      id: f.id,
      question: tri(f.questionEn, f.questionFr, f.questionUk, locale),
      answer: tri(f.answerEn, f.answerFr, f.answerUk, locale),
      viewCount: f.viewCount,
      helpfulCount: f.helpfulCount,
      popularityScore: Math.round((f.helpfulCount / Math.max(f.viewCount, 1)) * 100),
    })),
  });
}
