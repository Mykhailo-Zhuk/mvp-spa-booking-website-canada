import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET /api/admin/slots?serviceId=&therapistId=&date=&hideUnavailable=true
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const therapistId = searchParams.get("therapistId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const hideUnavailable = searchParams.get("hideUnavailable") === "true";

  const where: Record<string, unknown> = {};

  if (hideUnavailable) {
    where.isBooked = false;
  }

  if (serviceId) {
    where.OR = [
      { serviceId },
      { service: { slug: serviceId } },
    ];
  }

  if (therapistId) {
    where.therapistId = therapistId;
  }

  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    where.startTime = { gte: start, lt: end };
  }

  const [slots, therapists, services] = await Promise.all([
    prisma.slot.findMany({
      where,
      include: {
        therapist: true,
        service: true,
        promotion: true,
      },
      orderBy: [{ startTime: "asc" }, { therapist: { name: "asc" } }],
      take: 200,
    }),
    prisma.therapist.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, gender: true, avatarEmoji: true },
    }),
    prisma.service.findMany({
      orderBy: { basePrice: "asc" },
      select: { id: true, nameEn: true, nameFr: true, nameUk: true, slug: true, icon: true, basePrice: true, durationMin: true },
    }),
  ]);

  return NextResponse.json({
    slots: slots.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      serviceName: s.service.nameEn,
      serviceIcon: s.service.icon,
      serviceSlug: s.service.slug,
      durationMin: s.service.durationMin,
      therapistId: s.therapistId,
      therapistName: s.therapist.name,
      therapistAvatar: s.therapist.avatarEmoji,
      therapistGender: s.therapist.gender,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      startLabel: formatTime(s.startTime),
      endLabel: formatTime(s.endTime),
      dateStr: s.startTime.toISOString().split("T")[0],
      isBooked: s.isBooked,
      price: s.price,
      isFlashSale: s.isFlashSale,
    })),
    therapists,
    services,
  });
}

// POST /api/admin/slots
// Create a new available slot from admin panel
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    serviceId?: string;
    therapistId?: string;
    date?: string; // YYYY-MM-DD
    time?: string; // HH:mm
    startTime?: string; // ISO string
    price?: number;
    isBooked?: boolean;
  };

  const serviceId = body.serviceId?.trim();
  const therapistId = body.therapistId?.trim();

  if (!serviceId || !therapistId) {
    return NextResponse.json({ error: "Service and therapist are required" }, { status: 400 });
  }

  const [service, therapist] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.therapist.findUnique({ where: { id: therapistId } }),
  ]);

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  if (!therapist) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });

  let startDate: Date;
  if (body.startTime) {
    startDate = new Date(body.startTime);
  } else if (body.date && body.time) {
    startDate = new Date(`${body.date}T${body.time}:00`);
  } else {
    return NextResponse.json({ error: "Valid date and time are required" }, { status: 400 });
  }

  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid date or time format" }, { status: 400 });
  }

  const endDate = new Date(startDate.getTime() + service.durationMin * 60 * 1000);
  const price = typeof body.price === "number" && body.price > 0 ? body.price : service.basePrice;
  const isBooked = body.isBooked === true;

  // Check for unique slot constraint
  const existing = await prisma.slot.findUnique({
    where: {
      therapistId_serviceId_startTime: {
        therapistId,
        serviceId,
        startTime: startDate,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A slot for this therapist, service, and start time already exists" },
      { status: 409 }
    );
  }

  const slot = await prisma.slot.create({
    data: {
      serviceId,
      therapistId,
      startTime: startDate,
      endTime: endDate,
      price,
      isBooked,
    },
    include: {
      service: true,
      therapist: true,
    },
  });

  return NextResponse.json({
    ok: true,
    slot: {
      id: slot.id,
      serviceName: slot.service.nameEn,
      therapistName: slot.therapist.name,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      startLabel: formatTime(slot.startTime),
      isBooked: slot.isBooked,
      price: slot.price,
    },
  }, { status: 201 });
}
