import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/bookings?userId= — user's bookings with slot/service/therapist details.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const bookings = await prisma.booking.findMany({
    where: { userId, status: { not: "failed" } },
    include: { slot: { include: { therapist: true, service: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      bookingCode: b.bookingCode,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      service: b.slot.service.name,
      serviceIcon: b.slot.service.icon,
      therapist: b.slot.therapist.name,
      therapistEmoji: b.slot.therapist.avatarEmoji,
      startTime: b.slot.startTime.toISOString(),
      endTime: b.slot.endTime.toISOString(),
      basePrice: b.basePrice,
      taxAmount: b.taxAmount,
      tipAmount: b.tipAmount,
      totalPaid: b.totalPaid,
      taxRate: b.taxRate,
    })),
  });
}
