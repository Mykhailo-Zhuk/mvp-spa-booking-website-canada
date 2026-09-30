import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/services
// Returns all services with their details and slot/booking stats for admin overview.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const now = new Date();
  const services = await prisma.service.findMany({
    orderBy: [{ category: "asc" }, { basePrice: "asc" }],
    include: {
      _count: {
        select: {
          slots: true,
          bookings: true,
          faqs: true,
          guestGuideSteps: true,
        },
      },
      slots: {
        where: {
          isBooked: false,
          startTime: { gte: now },
        },
        select: { id: true },
      },
    },
  });

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      slug: s.slug,
      category: s.category,
      nameEn: s.nameEn,
      nameFr: s.nameFr,
      nameUk: s.nameUk,
      descriptionEn: s.descriptionEn,
      descriptionFr: s.descriptionFr,
      descriptionUk: s.descriptionUk,
      basePrice: s.basePrice,
      durationMin: s.durationMin,
      icon: s.icon,
      openSlotsCount: s.slots.length,
      totalSlotsCount: s._count.slots,
      bookingsCount: s._count.bookings,
      faqsCount: s._count.faqs,
      guestGuideStepsCount: s._count.guestGuideSteps,
    })),
  });
}

// POST /api/admin/services
// Create a new service from owner dashboard.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    category?: string;
    nameEn?: string;
    nameFr?: string;
    nameUk?: string;
    descriptionEn?: string;
    descriptionFr?: string;
    descriptionUk?: string;
    basePrice?: number;
    durationMin?: number;
    icon?: string;
  };

  const nameEn = body.nameEn?.trim();
  if (!nameEn) {
    return NextResponse.json({ error: "English name is required" }, { status: 400 });
  }

  const basePrice = Number(body.basePrice);
  if (isNaN(basePrice) || basePrice <= 0) {
    return NextResponse.json({ error: "Base price must be greater than 0" }, { status: 400 });
  }

  const durationMin = Math.round(Number(body.durationMin));
  if (isNaN(durationMin) || durationMin <= 0) {
    return NextResponse.json({ error: "Duration must be greater than 0" }, { status: 400 });
  }

  // Generate slug if not provided
  let slug = body.slug?.trim() || nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) slug = `service-${Date.now()}`;

  // Check unique slug
  const existing = await prisma.service.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const service = await prisma.service.create({
    data: {
      slug,
      category: body.category?.trim() || "massage",
      nameEn,
      nameFr: body.nameFr?.trim() || nameEn,
      nameUk: body.nameUk?.trim() || nameEn,
      descriptionEn: body.descriptionEn?.trim() || "",
      descriptionFr: body.descriptionFr?.trim() || "",
      descriptionUk: body.descriptionUk?.trim() || "",
      basePrice,
      durationMin,
      icon: body.icon?.trim() || "💆",
    },
  });

  return NextResponse.json({ ok: true, service }, { status: 201 });
}
