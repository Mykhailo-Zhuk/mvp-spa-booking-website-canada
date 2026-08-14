import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// In-app notifications for the notification bell (demo, US#4 fallback channel).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ notifications: [] });

  const notifications = await prisma.notificationLog.findMany({
    where: { userId, delivered: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
    })),
  });
}
