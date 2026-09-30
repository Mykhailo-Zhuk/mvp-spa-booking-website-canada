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
      const slotRow = db.prepare("SELECT count(*) as count, max(startTime) as maxDate FROM Slot").get() as {
        count: number;
        maxDate: string | null;
      } | undefined;

      // If user lacks password or slots table is empty / outdated
      if (!cols.some((c) => c.name === "password") || !slotRow || slotRow.count < 1000) {
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

  // Ensure schema compatibility and maintain rolling upcoming slot dates
  try {
    const db = new Database(targetPath);

    // 1. Ensure password column
    const cols = db.prepare("PRAGMA table_info(User)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "password")) {
      db.prepare("ALTER TABLE User ADD COLUMN password TEXT NOT NULL DEFAULT 'password123'").run();
    }

    // 2. Ensure future slots always exist (shift forward by whole weeks so weekdays and occupancy stay aligned)
    const slotRow = db.prepare("SELECT min(startTime) as minDate, max(startTime) as maxDate FROM Slot").get() as {
      minDate: string | null;
      maxDate: string | null;
    } | undefined;

    if (slotRow && slotRow.maxDate) {
      const now = Date.now();
      const maxTime = new Date(slotRow.maxDate).getTime();
      const targetLead = 4 * 86400000; // ensure at least 4 days of upcoming slots
      if (maxTime < now + targetLead) {
        const weeks = Math.ceil((now + targetLead - maxTime) / (7 * 86400000));
        const shiftMs = weeks * 7 * 86400000;
        const shiftTransaction = db.transaction(() => {
          const slots = db.prepare("SELECT id, startTime, endTime, flashSaleEndsAt FROM Slot").all() as {
            id: string;
            startTime: string;
            endTime: string;
            flashSaleEndsAt: string | null;
          }[];
          const updateSlot = db.prepare("UPDATE Slot SET startTime = ?, endTime = ?, flashSaleEndsAt = ? WHERE id = ?");
          for (const s of slots) {
            const newStart = new Date(new Date(s.startTime).getTime() + shiftMs).toISOString();
            const newEnd = new Date(new Date(s.endTime).getTime() + shiftMs).toISOString();
            const newFlash = s.flashSaleEndsAt
              ? new Date(new Date(s.flashSaleEndsAt).getTime() + shiftMs).toISOString()
              : null;
            updateSlot.run(newStart, newEnd, newFlash, s.id);
          }

          const promos = db.prepare("SELECT id, startTime, endTime FROM Promotion").all() as {
            id: string;
            startTime: string;
            endTime: string;
          }[];
          const updatePromo = db.prepare("UPDATE Promotion SET startTime = ?, endTime = ? WHERE id = ?");
          for (const p of promos) {
            const pStart = new Date(new Date(p.startTime).getTime() + shiftMs).toISOString();
            const pEnd = new Date(new Date(p.endTime).getTime() + shiftMs).toISOString();
            updatePromo.run(pStart, pEnd, p.id);
          }
        });
        shiftTransaction();
      }
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
