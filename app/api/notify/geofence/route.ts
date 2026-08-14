import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { haversineKm, demoDeliver, type GeofenceTarget } from "@/lib/demo/notify";

export const dynamic = "force-dynamic";

// US#4 Task 4.3 — /api/notify/geofence
// Spatial query demo (plan shows PostGIS ST_DWithin; SQLite → haversine in JS),
// simulated Firebase push with Twilio-SMS fallback, plus in-app duplicates.
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    lat?: number;
    lng?: number;
    radiusM?: number;
    title?: string;
    body?: string;
  };
  const center = { lat: Number(body.lat) || 51.1784, lng: Number(body.lng) || -115.5708 };
  const radiusM = Number(body.radiusM) || 10000;
  const title = body.title ?? "🔥 -20% today!";
  const msg = body.body ?? "Massage today in your area — book before the slot is gone!";

  const users = await prisma.user.findMany({
    where: { pushToken: { not: null } },
    select: { id: true, pushToken: true, phone: true, latitude: true, longitude: true },
  });

  const targets: GeofenceTarget[] = users
    .filter((u) => u.latitude !== null && u.longitude !== null)
    .map((u) => ({
      userId: u.id,
      pushToken: u.pushToken,
      phone: u.phone,
      distanceKm: haversineKm(center, { lat: u.latitude as number, lng: u.longitude as number }),
    }))
    .filter((t) => t.distanceKm * 1000 <= radiusM);

  const delivery = await demoDeliver({ title, body: msg, targets });

  // Persist delivery log + in-app duplicates (plan: banners in-app because push is often disabled).
  const now = new Date();
  await prisma.notificationLog.createMany({
    data: [
      ...targets.map((t) => ({ type: "push" as const, title, body: msg, userId: t.userId, delivered: true, createdAt: now })),
      ...targets.map((t) => ({ type: "inapp" as const, title, body: msg, userId: t.userId, delivered: true, createdAt: now })),
    ],
  });

  return NextResponse.json({
    targeted: targets.length,
    push_delivered: delivery.pushDelivered,
    sms_delivered: delivery.smsDelivered,
    failed: delivery.failed,
    center,
    radius_m: radiusM,
    message: msg,
  });
}
