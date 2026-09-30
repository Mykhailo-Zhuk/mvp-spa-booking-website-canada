import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, encodeSession, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    destination?: string;
  };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const destination = body.destination ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Enforce: clients cannot login to /admin, only owner/admin
  const isAdminTarget = destination.includes("/admin");
  if (isAdminTarget && !user.isAdmin) {
    return NextResponse.json(
      { error: "Access denied: Only owner/admin can log in to the admin panel." },
      { status: 403 }
    );
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession({ email: user.email, isAdmin: user.isAdmin }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    ok: true,
    email: user.email,
    isAdmin: user.isAdmin,
    name: user.name,
  });
}
