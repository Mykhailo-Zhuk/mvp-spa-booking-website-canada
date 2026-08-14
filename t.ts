import { PrismaClient } from "./app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
async function main() {
  const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
  const prisma = new PrismaClient({ adapter });
  const c = await prisma.user.count();
  console.log("user count:", c);
  await prisma.$disconnect();
}
main();
