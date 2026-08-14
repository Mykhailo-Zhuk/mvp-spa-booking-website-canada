import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// US#3 Task 3.1 — /api/guest-guide/:serviceId
export async function GET(_req: Request, ctx: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await ctx.params;
  const steps = await prisma.guestGuideStep.findMany({
    where: { serviceId },
    orderBy: { stepNumber: "asc" },
  });
  if (steps.length === 0) {
    return NextResponse.json({ steps: [], serviceName: null });
  }
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { name: true } });
  return NextResponse.json({
    steps: steps.map((s) => ({
      id: s.id,
      stepNumber: s.stepNumber,
      icon: s.icon,
      title: s.title,
      description: s.description,
      estimatedDurationMin: s.estimatedDurationMin,
    })),
    serviceName: service?.name ?? null,
  });
}
