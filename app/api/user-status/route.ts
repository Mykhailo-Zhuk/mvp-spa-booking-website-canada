import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// US#3 Task 3.3 — /api/user-status?userId=
// Determines whether the user has any completed booking → is_newbie flag.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalBookingsCount: true, firstBookingAt: true },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  return NextResponse.json({
    is_newbie: user.totalBookingsCount === 0,
    total_bookings: user.totalBookingsCount,
    first_booking_at: user.firstBookingAt,
  });
}
