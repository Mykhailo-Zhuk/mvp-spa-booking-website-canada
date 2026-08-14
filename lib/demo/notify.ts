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
