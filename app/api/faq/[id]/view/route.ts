import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// US#3 Task 3.2 — analytics: +1 view_count when a question is expanded.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const faq = await prisma.faq.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });
  return NextResponse.json({ ok: true, viewCount: faq.viewCount });
}
