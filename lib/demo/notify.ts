// Demo-mode geo push notifications (US#4, Task 4.3).
// Production: PostGIS ST_DWithin + Firebase Cloud Messaging + Twilio SMS fallback.
// Demo: haversine in JS (SQLite has no PostGIS) + simulated delivery; "offline" demo
// tokens are delivered via simulated SMS instead of push (plan's fallback scenario).

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface GeofenceTarget {
  userId: string;
  pushToken: string | null;
  phone: string | null;
  distanceKm: number;
}

export interface DeliveryResult {
  pushDelivered: number;
  smsDelivered: number;
  failed: number;
  total: number;
}

/**
 * Simulate FCM push with Twilio-SMS fallback for undeliverable tokens.
 * Tokens containing "offline" simulate NotRegistered/offline devices → SMS fallback
 * after 1 minute (compressed to demo time).
 */
export async function demoDeliver(opts: {
  title: string;
  body: string;
  targets: GeofenceTarget[];
}): Promise<DeliveryResult> {
  const { targets } = opts;
  const result: DeliveryResult = { pushDelivered: 0, smsDelivered: 0, failed: 0, total: targets.length };

  // Simulated FCM fan-out latency.
  await new Promise((r) => setTimeout(r, 600));

  for (const t of targets) {
    if (!t.pushToken) {
      result.failed++;
      continue;
    }
    if (t.pushToken.includes("offline") || t.pushToken.includes("guest8")) {
      if (t.phone) result.smsDelivered++;
      else result.failed++;
    } else {
      result.pushDelivered++;
    }
  }

  return result;
}

/** Plan's message template: "🔥 Увага! Знижка 25% на масаж сьогодні о 14:00 у вашому районі!" */
export function flashMessage(percent: number, serviceName: string, hour: string, locale: "en" | "fr" = "en"): { title: string; body: string } {
  const title = locale === "fr" ? `🔥 -${percent}% aujourd'hui !` : `🔥 -${percent}% today!`;
  const body =
    locale === "fr"
      ? `${serviceName} à ${hour} dans votre quartier — réservez avant que le créneau ne disparaisse !`
      : `${serviceName} at ${hour} in your area — book before the slot is gone!`;
  return { title, body };
}

export interface GeofenceInput {
  center: LatLng;
  radiusM: number;
  title: string;
  body: string;
}

export interface GeofenceResult {
  targeted: number;
  push_delivered: number;
  sms_delivered: number;
  failed: number;
  center: LatLng;
  radius_m: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts Prisma client (imported in route handlers)
type AnyPrisma = { user: { findMany: (args: any) => Promise<any[]> }; notificationLog: { createMany: (args: any) => Promise<unknown> } };

/**
 * Geofence fan-out (US#4 Task 4.3): find users within radius (haversine — demo stand-in
 * for PostGIS ST_DWithin), simulate Firebase push with Twilio-SMS fallback, persist logs
 * + in-app duplicates. Shared by /api/notify/geofence and the flash-sale trigger.
 */
export async function geofenceNotify(db: AnyPrisma, input: GeofenceInput): Promise<GeofenceResult> {
  const users = await db.user.findMany({
    where: { pushToken: { not: null } },
    select: { id: true, pushToken: true, phone: true, latitude: true, longitude: true },
  });

  const targets: GeofenceTarget[] = users
    .filter((u: { latitude: number | null; longitude: number | null }) => u.latitude !== null && u.longitude !== null)
    .map((u: { id: string; pushToken: string | null; phone: string | null; latitude: number; longitude: number }) => ({
      userId: u.id,
      pushToken: u.pushToken,
      phone: u.phone,
      distanceKm: haversineKm(input.center, { lat: u.latitude, lng: u.longitude }),
    }))
    .filter((t) => t.distanceKm * 1000 <= input.radiusM);

  const delivery = await demoDeliver({ title: input.title, body: input.body, targets });

  // Persist delivery log + in-app duplicates (plan: banners in-app because push is often disabled).
  const now = new Date();
  await db.notificationLog.createMany({
    data: [
      ...targets.map((t) => ({ type: "push" as const, title: input.title, body: input.body, userId: t.userId, delivered: true, createdAt: now })),
      ...targets.map((t) => ({ type: "inapp" as const, title: input.title, body: input.body, userId: t.userId, delivered: true, createdAt: now })),
    ],
  });

  return {
    targeted: targets.length,
    push_delivered: delivery.pushDelivered,
    sms_delivered: delivery.smsDelivered,
    failed: delivery.failed,
    center: input.center,
    radius_m: input.radiusM,
  };
}
