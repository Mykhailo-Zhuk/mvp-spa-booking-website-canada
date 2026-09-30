import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET /api/admin/slots/[id]
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await ctx.params;
  const slot = await prisma.slot.findUnique({
    where: { id },
    include: { service: true, therapist: true, bookings: true },
  });

  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  return NextResponse.json({
    slot: {
      id: slot.id,
      serviceId: slot.serviceId,
      serviceName: slot.service.nameEn,
      serviceIcon: slot.service.icon,
      durationMin: slot.service.durationMin,
      therapistId: slot.therapistId,
      therapistName: slot.therapist.name,
      therapistAvatar: slot.therapist.avatarEmoji,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      startLabel: formatTime(slot.startTime),
      endLabel: formatTime(slot.endTime),
      dateStr: slot.startTime.toISOString().split("T")[0],
      isBooked: slot.isBooked,
      price: slot.price,
    },
  });
}

// PATCH /api/admin/slots/[id]
// Modify slot: change date, start time, end time, therapist, price, or availability status (isBooked)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await prisma.slot.findUnique({
    where: { id },
    include: { service: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    date?: string; // YYYY-MM-DD
    time?: string; // HH:mm
    startTime?: string; // ISO string
    therapistId?: string;
    serviceId?: string;
    price?: number;
    isBooked?: boolean;
  };

  const dataToUpdate: Record<string, unknown> = {};

  // Update therapist if provided
  if (body.therapistId !== undefined && body.therapistId !== existing.therapistId) {
    const t = await prisma.therapist.findUnique({ where: { id: body.therapistId } });
    if (!t) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    dataToUpdate.therapistId = t.id;
  }

  // Update service if provided
  let durationMin = existing.service.durationMin;
  if (body.serviceId !== undefined && body.serviceId !== existing.serviceId) {
    const s = await prisma.service.findUnique({ where: { id: body.serviceId } });
    if (!s) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    dataToUpdate.serviceId = s.id;
    durationMin = s.durationMin;
  }

  // Update price if provided
  if (body.price !== undefined) {
    const priceNum = Number(body.price);
    if (!isNaN(priceNum) && priceNum > 0) {
      dataToUpdate.price = priceNum;
    }
  }

  // Update availability status (isBooked: false = Available, isBooked: true = Unavailable)
  if (body.isBooked !== undefined) {
    dataToUpdate.isBooked = Boolean(body.isBooked);
  }

  // Update time/date
  if (body.startTime || (body.date && body.time)) {
    let newStart: Date;
    if (body.startTime) {
      newStart = new Date(body.startTime);
    } else {
      newStart = new Date(`${body.date}T${body.time}:00`);
    }

    if (isNaN(newStart.getTime())) {
      return NextResponse.json({ error: "Invalid date or time format" }, { status: 400 });
    }

    dataToUpdate.startTime = newStart;
    dataToUpdate.endTime = new Date(newStart.getTime() + durationMin * 60 * 1000);
  }

  // Check unique conflict if time/therapist/service changed
  const targetTherapistId = (dataToUpdate.therapistId as string) || existing.therapistId;
  const targetServiceId = (dataToUpdate.serviceId as string) || existing.serviceId;
  const targetStartTime = (dataToUpdate.startTime as Date) || existing.startTime;

  if (
    targetTherapistId !== existing.therapistId ||
    targetServiceId !== existing.serviceId ||
    targetStartTime.getTime() !== existing.startTime.getTime()
  ) {
    const conflict = await prisma.slot.findFirst({
      where: {
        id: { not: existing.id },
        therapistId: targetTherapistId,
        serviceId: targetServiceId,
        startTime: targetStartTime,
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Another slot already exists for this therapist, service, and start time" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.slot.update({
    where: { id: existing.id },
    data: dataToUpdate,
    include: {
      service: true,
      therapist: true,
    },
  });

  return NextResponse.json({
    ok: true,
    slot: {
      id: updated.id,
      serviceName: updated.service.nameEn,
      serviceIcon: updated.service.icon,
      therapistName: updated.therapist.name,
      therapistAvatar: updated.therapist.avatarEmoji,
      startTime: updated.startTime.toISOString(),
      endTime: updated.endTime.toISOString(),
      startLabel: formatTime(updated.startTime),
      endLabel: formatTime(updated.endTime),
      dateStr: updated.startTime.toISOString().split("T")[0],
      isBooked: updated.isBooked,
      price: updated.price,
    },
  });
}

// DELETE /api/admin/slots/[id]
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await prisma.slot.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // Delete any promotion referencing this slot
  await prisma.promotion.deleteMany({ where: { slotId: existing.id } });
  // Delete slot
  await prisma.slot.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true, message: "Slot deleted" });
}
