import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { User } from "@/app/generated/prisma/client";

export const SESSION_COOKIE = "spa_demo_session";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !password) return false;
  if (!stored.includes(":")) {
    return password === stored;
  }
  try {
    const [salt, key] = stored.split(":");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return key === hash;
  } catch {
    return false;
  }
}

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
  try {
    return await prisma.user.findUnique({ where: { email: session.email } });
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

export async function requireAdmin(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return null;
  return user;
}
