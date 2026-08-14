import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { cad, isoDay } from "@/lib/format";

export const dynamic = "force-dynamic";

// US#4 — dashboard widgets: revenue today, active flash sales, delivery stats.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const today = new Date();
  const todayKey = isoDay(today);

  const [confirmedToday, promos, pushLogs, smsLogs] = await Promise.all([
    prisma.booking.findMany({
      where: { status: "confirmed" },
      include: { slot: true },
    }),
    prisma.promotion.findMany({
      where: { isActive: true, endTime: { gt: new Date() } },
      include: { slot: { include: { service: true } } },
    }),
    prisma.notificationLog.findMany({ where: { type: "push" }, take: 500 }),
    prisma.notificationLog.findMany({ where: { type: "sms" }, take: 500 }),
  ]);

  const revenueToday = confirmedToday
    .filter((b) => isoDay(b.createdAt) === todayKey)
    .reduce((sum, b) => sum + b.totalPaid, 0);

  // Flash-sale revenue: bookings whose slot had an active promo at creation (approximation: totalPaid < base)
  const flashRevenue = confirmedToday
    .filter((b) => isoDay(b.createdAt) === todayKey && b.totalPaid < b.basePrice + b.taxAmount + b.tipAmount - 0.005)
    .reduce((sum, b) => sum + b.totalPaid, 0);

  return NextResponse.json({
    revenue_today: revenueToday,
    revenue_today_label: cad(revenueToday),
    flash_revenue_today: flashRevenue,
    active_promos: promos.map((p) => ({
      id: p.id,
      slotId: p.slotId,
      discountPercent: p.discountPercent,
      originalPrice: p.originalPrice,
      discountedPrice: p.discountedPrice,
      endTime: p.endTime.toISOString(),
      service: p.slot?.service.name ?? "—",
    })),
    delivery: {
      push_delivered: pushLogs.filter((l) => l.delivered).length,
      sms_delivered: smsLogs.filter((l) => l.delivered).length,
      total: pushLogs.length + smsLogs.length,
    },
  });
}
