import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { geofenceNotify } from "@/lib/demo/notify";

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

  const result = await geofenceNotify(prisma, {
    center: { lat: Number(body.lat) || 51.1784, lng: Number(body.lng) || -115.5708 },
    radiusM: Number(body.radiusM) || 10000,
    title: body.title ?? "🔥 -20% today!",
    body: body.body ?? "Massage today in your area — book before the slot is gone!",
  });

  return NextResponse.json(result);
}
