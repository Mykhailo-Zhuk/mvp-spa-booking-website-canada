import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// US#2 Task 2.3 — /api/generate-voucher/:bookingId
// Demo: returns all voucher data (production would render + store the PDF in S3/Cloudinary
// and return voucher_url). Client renders the A6 PDF from this payload.
export async function GET(_req: Request, ctx: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: { include: { service: true, therapist: true } }, user: true },
  });
  if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });

  return NextResponse.json({
    booking_code: booking.bookingCode,
    service: booking.slot.service.name,
    therapist: booking.slot.therapist.name,
    start_time: booking.slot.startTime.toISOString(),
    end_time: booking.slot.endTime.toISOString(),
    guest_name: booking.user.name,
    total_paid: booking.totalPaid,
    tax_rate: booking.taxRate,
    tax_amount: booking.taxAmount,
    tip_amount: booking.tipAmount,
    voucher_url: booking.voucherUrl, // null in demo — PDF is generated client-side
  });
}
