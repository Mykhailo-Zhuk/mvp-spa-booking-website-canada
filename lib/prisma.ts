import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

// Prisma 7 requires a driver adapter. SQLite path is CWD-relative (matching prisma CLI):
// "file:./dev.db" → <project root>/dev.db when running from the project root.

/**
 * Serverless (Vercel) filesystems are read-only except `/tmp` and are ephemeral,
 * so a local SQLite file persisted across requests is impossible there. For the demo
 * mode we point Prisma at `/tmp/dev.db` and seed it once per instance from the
 * committed snapshot `bench/fixtures/dev.db.pristine` (a fully seeded demo database).
 * Data written during a request lives only for that instance — acceptable for demo.
 */
function resolveDbUrl(): string {
  if (process.env.NODE_ENV === "production") {
    // If an explicit non-local DATABASE_URL is provided, honor it (e.g. a hosted DB).
    const explicit = process.env.DATABASE_URL;
    if (explicit && explicit !== "file:./dev.db" && explicit !== "file:/tmp/dev.db") {
      return explicit;
    }
    ensureSeededDemoDb("/tmp/dev.db");
    return "file:/tmp/dev.db";
  }
  return process.env.DATABASE_URL ?? "file:./dev.db";
}

import Database from "better-sqlite3";

/** Copy the git-tracked seeded demo snapshot into `targetPath` if that file is missing or outdated. */
function ensureSeededDemoDb(targetPath: string): void {
  const snapshot = join(process.cwd(), "bench", "fixtures", "dev.db.pristine");
  let needsCopy = !existsSync(targetPath);

  if (!needsCopy) {
    try {
      const db = new Database(targetPath);
      const cols = db.prepare("PRAGMA table_info(User)").all() as { name: string }[];
      if (!cols.some((c) => c.name === "password")) {
        needsCopy = true;
      }
      db.close();
    } catch {
      needsCopy = true;
    }
  }

  if (needsCopy && existsSync(snapshot)) {
    try {
      copyFileSync(snapshot, targetPath);
    } catch {
      // Read-only FS or cold-start race: leave it; the adapter will surface any error.
    }
  }

  // Fallback safety: ensure required columns exist even on warm reused containers
  try {
    const db = new Database(targetPath);
    const cols = db.prepare("PRAGMA table_info(User)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "password")) {
      db.prepare("ALTER TABLE User ADD COLUMN password TEXT NOT NULL DEFAULT 'password123'").run();
    }
    db.close();
  } catch {
    // Adapter or queries will handle errors if any
  }
}

const adapter = new PrismaBetterSqlite3({ url: resolveDbUrl() });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
