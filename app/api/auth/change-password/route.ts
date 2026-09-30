import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
    targetUserId?: string;
    targetEmail?: string;
  };

  const newPassword = body.newPassword?.trim();
  if (!newPassword || newPassword.length < 4) {
    return NextResponse.json(
      { error: "New password must be at least 4 characters long" },
      { status: 400 }
    );
  }

  // Admin changing a client's password
  const hasTarget = (body.targetUserId && body.targetUserId !== user.id) || (body.targetEmail && body.targetEmail.toLowerCase() !== user.email.toLowerCase());
  if (hasTarget) {
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required to modify other accounts" },
        { status: 403 }
      );
    }

    const target = body.targetUserId
      ? await prisma.user.findUnique({ where: { id: body.targetUserId } })
      : await prisma.user.findUnique({ where: { email: body.targetEmail?.trim().toLowerCase() } });
    if (!target) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { password: hashPassword(newPassword) },
    });

    return NextResponse.json({
      ok: true,
      message: `Password updated for ${target.name} (${target.email})`,
    });
  }

  // User changing their own password
  const currentPassword = body.currentPassword ?? "";
  if (!verifyPassword(currentPassword, user.password)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword(newPassword) },
  });

  return NextResponse.json({
    ok: true,
    message: "Password changed successfully",
  });
}
