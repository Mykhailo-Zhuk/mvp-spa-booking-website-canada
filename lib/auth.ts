// Demo auth (plan: Sofia logs into /admin; customers identify for bookings).
// Simple signed-ish cookie session. Not production auth — no passwords stored.

import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { User } from "@/app/generated/prisma/client";

export const SESSION_COOKIE = "spa_demo_session";

export interface Session {
  email: string;
  isAdmin: boolean;
}

export function encodeSession(s: Session): string {
  return Buffer.from(JSON.stringify(s)).toString("base64url");
}

export function decodeSession(raw: string): Session | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Session;
    if (typeof parsed.email === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { email: session.email } });
}

export async function requireAdmin(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return null;
  return user;
}
