import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

// Prisma 7 requires a driver adapter. SQLite path is CWD-relative (matching prisma CLI):
// "file:./dev.db" → <project root>/dev.db when running from the project root.
const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
