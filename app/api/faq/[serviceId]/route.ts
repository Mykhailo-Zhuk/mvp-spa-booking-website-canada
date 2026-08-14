import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// US#3 Task 3.2 — /api/faq/:serviceId (sorted by popularity_score → view_count)
export async function GET(_req: Request, ctx: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await ctx.params;
  const faqs = await prisma.faq.findMany({
    where: { serviceId },
    orderBy: [{ viewCount: "desc" }, { helpfulCount: "desc" }],
  });
  return NextResponse.json({
    faqs: faqs.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      viewCount: f.viewCount,
      helpfulCount: f.helpfulCount,
      popularityScore: Math.round((f.helpfulCount / Math.max(f.viewCount, 1)) * 100),
    })),
  });
}
