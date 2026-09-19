import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { round2 } from "@/lib/taxes";
import { geofenceNotify } from "@/lib/demo/notify";

export const dynamic = "force-dynamic";

// US#4 Task 4.2 — /api/admin/create-flash-sale
// Body: { slotId, discountPercent (5..50), durationHours }
// Creates/updates a Promotion, reprices the slot (keeping original_price) and
// triggers the geo push fan-out (Task 4.3) — all in one click, per Sofia's story.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    slotId?: string;
    discountPercent?: number;
    durationHours?: number;
  };
  const percent = Math.min(50, Math.max(5, Number(body.discountPercent) || 20));
  const hours = Math.min(24, Math.max(1, Number(body.durationHours) || 2));
  if (!body.slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 });

  const slot = await prisma.slot.findUnique({
    where: { id: body.slotId },
    include: { service: true, promotion: true },
  });
  if (!slot) return NextResponse.json({ error: "slot not found" }, { status: 404 });
  if (slot.isBooked) return NextResponse.json({ error: "slot already booked" }, { status: 409 });

  const originalPrice = slot.promotion?.isActive && slot.promotion.endTime > new Date()
    ? slot.promotion.originalPrice
    : slot.price;
  const discountedPrice = round2(originalPrice * (1 - percent / 100));

  const endTime = new Date(Date.now() + hours * 3600 * 1000);

  await prisma.$transaction([
    prisma.promotion.upsert({
      where: { slotId: slot.id },
      create: {
        slotId: slot.id,
        originalPrice,
        discountedPrice,
        discountPercent: percent,
        startTime: new Date(),
        endTime,
        isActive: true,
      },
      update: { originalPrice, discountedPrice, discountPercent: percent, startTime: new Date(), endTime, isActive: true },
    }),
    prisma.slot.update({
      where: { id: slot.id },
      data: { price: discountedPrice, originalPrice: originalPrice === slot.price ? slot.price : slot.originalPrice ?? slot.price, isFlashSale: true, flashSaleEndsAt: endTime },
    }),
  ]);

  // Task 4.3 trigger: fan out geo push to customers within 10 km of the spa (shared lib,
  // no cookie forwarding needed).
  const notify = await geofenceNotify(prisma, {
    center: { lat: 51.1784, lng: -115.5708 },
    radiusM: 10000,
    title: `🔥 -${percent}% today!`,
    body: `${slot.service.nameEn} today — book before the slot is gone!`,
  }).catch(() => null);

  return NextResponse.json({
    ok: true,
    slot_id: slot.id,
    discount_percent: percent,
    original_price: originalPrice,
    discounted_price: discountedPrice,
    risk_lost: round2(originalPrice - discountedPrice),
    duration_hours: hours,
    end_time: endTime.toISOString(),
    notification_delivery: notify,
  });
}
