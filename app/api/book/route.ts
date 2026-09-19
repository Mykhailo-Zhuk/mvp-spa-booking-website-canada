import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePrice, DEFAULT_PROVINCE } from "@/lib/taxes";
import { processDemoPayment } from "@/lib/demo/payment";
import { tri, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// US#1 Task 1.3 — /api/book
// Body: { slotId, userId, province, tipPercent, cardLast4, locale }
// Flow: simulate payment → atomically book slot → create booking with unique booking_code
// → bump user totals. Declined payment leaves the slot available (plan scenario).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    slotId?: string;
    userId?: string;
    province?: string;
    tipPercent?: number;
    cardLast4?: string;
    locale?: string;
  };
  const locale = (body.locale ?? "en") as Locale;

  if (!body.slotId || !body.userId) {
    return NextResponse.json({ error: "slotId and userId required" }, { status: 400 });
  }

  const slot = await prisma.slot.findUnique({
    where: { id: body.slotId },
    include: { service: true, therapist: true, promotion: true },
  });
  if (!slot) return NextResponse.json({ error: "slot not found" }, { status: 404 });
  if (slot.isBooked) return NextResponse.json({ error: "slot already booked" }, { status: 409 });

  const user = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Apply flash-sale price if an active promo exists (plan Task 4.2).
  const activeFlash = slot.promotion && slot.promotion.isActive && slot.promotion.endTime > new Date();
  const basePrice = activeFlash ? slot.promotion!.discountedPrice : slot.price;
  const tipPercent = body.tipPercent ?? 0;

  const breakdown = calculatePrice(basePrice, { province: body.province ?? user.province ?? DEFAULT_PROVINCE, tipPercent });

  // 1) Simulated Stripe payment (deterministic demo: card ...0002 declines).
  const payment = await processDemoPayment({ amount: breakdown.total, cardLast4: body.cardLast4 ?? "4242" });

  // 2) Atomically book the slot (or record the failed transaction without blocking it).
  const booking = await prisma.$transaction(async (tx) => {
    const seq = (await tx.booking.count({ where: { status: { not: "failed" } } })) + 1;
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const bookingCode = `SPA-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${String(seq).padStart(3, "0")}`;

    if (payment.status === "succeeded") {
      await tx.slot.update({ where: { id: slot.id }, data: { isBooked: true } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          totalBookingsCount: { increment: 1 },
          firstBookingAt: user.firstBookingAt ?? new Date(),
        },
      });
    }

    const booking = await tx.booking.create({
      data: {
        bookingCode,
        userId: user.id,
        slotId: slot.id,
        serviceId: slot.serviceId,
        basePrice,
        taxRate: breakdown.taxRate,
        taxAmount: breakdown.taxAmount,
        tipAmount: breakdown.tipAmount,
        totalPaid: breakdown.total,
        status: payment.status === "succeeded" ? "confirmed" : "failed",
      },
    });

    return { booking, bookingCode, activeFlash };
  });

  return NextResponse.json({
    status: payment.status === "succeeded" ? "confirmed" : "failed",
    reason: payment.reason,
    transaction_id: payment.transactionId,
    booking: {
      id: booking.booking.id,
      booking_code: booking.bookingCode,
      service: tri(slot.service.nameEn, slot.service.nameFr, slot.service.nameUk, locale),
      start_time: slot.startTime.toISOString(),
      therapist: slot.therapist.name,
      therapist_gender: slot.therapist.gender,
      base_price: breakdown.basePrice,
      tax: breakdown.taxAmount,
      tip: breakdown.tipAmount,
      total: breakdown.total,
      tax_label: breakdown.taxLabel,
      was_flash_sale: !!booking.activeFlash,
    },
  });
}
