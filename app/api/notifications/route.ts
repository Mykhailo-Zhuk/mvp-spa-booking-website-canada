import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tri, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// In-app notifications for the notification bell (demo, US#4 fallback channel).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const locale = (searchParams.get("locale") ?? "en") as Locale;
  if (!userId) return NextResponse.json({ notifications: [] });

  const notifications = await prisma.notificationLog.findMany({
    where: { userId, delivered: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: tri(n.titleEn, n.titleFr, n.titleUk, locale),
      body: tri(n.bodyEn, n.bodyFr, n.bodyUk, locale),
      createdAt: n.createdAt,
    })),
  });
}
