import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatTime, isoDay } from "@/lib/format";

export const dynamic = "force-dynamic";

// US#4 Task 4.1 — /api/admin/hot-slots
// Forecast fill_rate per future slot from last-7-days OccupancyStat (weekday + hour).
// Slots with fill_rate < 30% are "burning" and sorted worst-first (red at top).
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  // Sweep expired promos (plan Task 4.2: auto-deactivate after the timer).
  await prisma.promotion.updateMany({
    where: { isActive: true, endTime: { lt: new Date() } },
    data: { isActive: false },
  });

  const [stats, slots] = await Promise.all([
    prisma.occupancyStat.findMany(),
    prisma.slot.findMany({
      where: { isBooked: false, startTime: { gte: new Date(), lt: new Date(Date.now() + 8 * 86400000) } },
      include: { service: true, therapist: true, promotion: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // Aggregate historical fill by (weekday, hour)
  const byKey = new Map<string, number[]>();
  for (const s of stats) {
    const key = `${s.weekday}:${s.hour}`;
    const arr = byKey.get(key) ?? [];
    arr.push(s.fillRate);
    byKey.set(key, arr);
  }
  const avgFill = (weekday: number, hour: number): number => {
    const arr = byKey.get(`${weekday}:${hour}`);
    if (!arr || arr.length === 0) return 0.35; // no data → neutral
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const now = new Date();
  const hot = [];
  for (const s of slots) {
    const weekday = s.startTime.getDay();
    const hour = s.startTime.getHours();
    const fillRate = avgFill(weekday, hour);
    // Skip non-burning slots up front instead of building a full object for every
    // slot and discarding most of them later — the sort/tie behaviour is unchanged
    // because fillRate is the only sort key and V8's sort is stable.
    if (fillRate >= 0.3) continue;
    const activeFlash = s.promotion && s.promotion.isActive && s.promotion.endTime > now;
    hot.push({
      id: s.id,
      startTime: s.startTime.toISOString(),
      startLabel: formatTime(s.startTime),
      dayLabel: isoDay(s.startTime),
      weekday,
      hour,
      fillRate,
      isHot: true,
      price: activeFlash ? s.promotion!.discountedPrice : s.price,
      originalPrice: activeFlash ? s.promotion!.originalPrice : null,
      isFlashSale: !!activeFlash,
      service: { id: s.service.id, name: s.service.nameEn, icon: s.service.icon },
      therapist: { name: s.therapist.name, avatarEmoji: s.therapist.avatarEmoji },
    });
  }
  hot.sort((a, b) => a.fillRate - b.fillRate);

  return NextResponse.json({ hot_slots: hot.slice(0, 30), total_scanned: slots.length });
}
