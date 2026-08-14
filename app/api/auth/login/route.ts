import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, encodeSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Demo login: any seeded user email (no password in demo mode).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Unknown demo user" }, { status: 404 });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession({ email: user.email, isAdmin: user.isAdmin }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, email: user.email, isAdmin: user.isAdmin, name: user.name });
}
