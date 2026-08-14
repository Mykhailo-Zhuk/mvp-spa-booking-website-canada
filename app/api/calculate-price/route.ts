import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePrice, DEFAULT_PROVINCE } from "@/lib/taxes";

export const dynamic = "force-dynamic";

// US#1 Task 1.2 — /api/calculate-price
// Body: { serviceId?, slotId?, province?, tipPercent? } → { base_price, tax, total, suggested_tip }
// Tax logic lives on the backend (plan risk mitigation: "Винести логіку податків на бекенд").
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    serviceId?: string;
    slotId?: string;
    province?: string;
    tipPercent?: number;
  };

  let basePrice = 0;
  let serviceName = "";

  if (body.slotId) {
    const slot = await prisma.slot.findUnique({
      where: { id: body.slotId },
      include: { service: true, promotion: true },
    });
    if (!slot) return NextResponse.json({ error: "slot not found" }, { status: 404 });
    const activeFlash = slot.promotion && slot.promotion.isActive && slot.promotion.endTime > new Date();
    basePrice = activeFlash ? slot.promotion!.discountedPrice : slot.price;
    serviceName = slot.service.name;
  } else if (body.serviceId) {
    const service = await prisma.service.findUnique({ where: { id: body.serviceId } });
    if (!service) return NextResponse.json({ error: "service not found" }, { status: 404 });
    basePrice = service.basePrice;
    serviceName = service.name;
  }

  const breakdown = calculatePrice(basePrice, {
    province: body.province ?? DEFAULT_PROVINCE,
    tipPercent: body.tipPercent ?? 0,
  });

  return NextResponse.json({
    service_name: serviceName,
    base_price: breakdown.basePrice,
    tax_rate: breakdown.taxRate,
    tax: breakdown.taxAmount,
    tax_label: breakdown.taxLabel,
    suggested_tip: Math.round(breakdown.basePrice * 0.15 * 100) / 100,
    tip_percent: breakdown.tipPercent,
    tip: breakdown.tipAmount,
    total: breakdown.total,
  });
}
