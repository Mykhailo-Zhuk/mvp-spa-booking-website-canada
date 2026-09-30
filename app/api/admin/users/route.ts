import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      province: true,
      totalBookingsCount: true,
      createdAt: true,
    },
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ users });
}
