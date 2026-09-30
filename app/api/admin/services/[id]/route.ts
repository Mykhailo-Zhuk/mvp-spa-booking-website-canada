import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/services/[id]
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await ctx.params;
  const now = new Date();

  const service = await prisma.service.findUnique({
    where: { id },
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

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({
    service: {
      id: service.id,
      slug: service.slug,
      category: service.category,
      nameEn: service.nameEn,
      nameFr: service.nameFr,
      nameUk: service.nameUk,
      descriptionEn: service.descriptionEn,
      descriptionFr: service.descriptionFr,
      descriptionUk: service.descriptionUk,
      basePrice: service.basePrice,
      durationMin: service.durationMin,
      icon: service.icon,
      openSlotsCount: service.slots.length,
      totalSlotsCount: service._count.slots,
      bookingsCount: service._count.bookings,
      faqsCount: service._count.faqs,
      guestGuideStepsCount: service._count.guestGuideSteps,
    },
  });
}

// PATCH /api/admin/services/[id]
// Edit available service fields
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await ctx.params;

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

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

  const dataToUpdate: Record<string, unknown> = {};

  if (body.nameEn !== undefined) {
    const val = body.nameEn.trim();
    if (!val) return NextResponse.json({ error: "English name cannot be empty" }, { status: 400 });
    dataToUpdate.nameEn = val;
  }
  if (body.nameFr !== undefined) {
    dataToUpdate.nameFr = body.nameFr.trim();
  }
  if (body.nameUk !== undefined) {
    dataToUpdate.nameUk = body.nameUk.trim();
  }
  if (body.descriptionEn !== undefined) {
    dataToUpdate.descriptionEn = body.descriptionEn.trim();
  }
  if (body.descriptionFr !== undefined) {
    dataToUpdate.descriptionFr = body.descriptionFr.trim();
  }
  if (body.descriptionUk !== undefined) {
    dataToUpdate.descriptionUk = body.descriptionUk.trim();
  }
  if (body.basePrice !== undefined) {
    const price = Number(body.basePrice);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "Base price must be greater than 0" }, { status: 400 });
    }
    dataToUpdate.basePrice = price;
  }
  if (body.durationMin !== undefined) {
    const dur = Math.round(Number(body.durationMin));
    if (isNaN(dur) || dur <= 0) {
      return NextResponse.json({ error: "Duration must be greater than 0" }, { status: 400 });
    }
    dataToUpdate.durationMin = dur;
  }
  if (body.category !== undefined) {
    const cat = body.category.trim();
    if (!cat) return NextResponse.json({ error: "Category cannot be empty" }, { status: 400 });
    dataToUpdate.category = cat;
  }
  if (body.icon !== undefined) {
    const icon = body.icon.trim();
    if (!icon) return NextResponse.json({ error: "Icon cannot be empty" }, { status: 400 });
    dataToUpdate.icon = icon;
  }
  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (slug && slug !== existing.slug) {
      const slugClash = await prisma.service.findUnique({ where: { slug } });
      if (slugClash) {
        return NextResponse.json({ error: "Slug is already in use by another service" }, { status: 409 });
      }
      dataToUpdate.slug = slug;
    }
  }

  const updated = await prisma.service.update({
    where: { id },
    data: dataToUpdate,
  });

  return NextResponse.json({ ok: true, service: updated });
}

// PUT /api/admin/services/[id] alias to PATCH
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}
