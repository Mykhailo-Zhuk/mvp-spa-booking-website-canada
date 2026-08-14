import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// US#1 Task 1.1 — /api/availability?date=&gender=&serviceId=&therapistId=
// Returns real slots for a day with therapist + service info and current status.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const gender = searchParams.get("gender");
  const serviceId = searchParams.get("serviceId");
  const therapistId = searchParams.get("therapistId");

  if (!date) return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);

  const where: Record<string, unknown> = { startTime: { gte: start, lt: end } };
  if (gender && gender !== "any") where.therapist = { gender };
  if (serviceId) where.serviceId = serviceId;
  if (therapistId) where.therapistId = therapistId;

  const slots = await prisma.slot.findMany({
    where,
    include: { therapist: true, service: true, promotion: true },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({
    date,
    slots: slots.map((s) => {
      // Flash-sale price override (plan Task 4.2 keeps original_price)
      const activeFlash = s.promotion && s.promotion.isActive && s.promotion.endTime > new Date();
      const price = activeFlash ? s.promotion!.discountedPrice : s.price;
      const originalPrice = activeFlash ? s.price : null;
      return {
        id: s.id,
        startTime: s.startTime.toISOString(),
        startLabel: formatTime(s.startTime),
        endTime: s.endTime.toISOString(),
        durationMin: s.service.durationMin,
        isBooked: s.isBooked,
        isFlashSale: !!activeFlash,
        price,
        originalPrice,
        therapist: { id: s.therapist.id, name: s.therapist.name, gender: s.therapist.gender, avatarEmoji: s.therapist.avatarEmoji },
        service: { id: s.service.id, name: s.service.name, slug: s.service.slug, icon: s.service.icon, basePrice: s.service.basePrice },
      };
    }),
  });
}
