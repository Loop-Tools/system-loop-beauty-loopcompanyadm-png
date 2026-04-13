import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { withTenant } from "@/lib/prisma-tenant";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaTenant: ReturnType<typeof withTenant> | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: path.join(process.cwd(), "dev.db"),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const rawPrisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = rawPrisma;

const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;

export const prismaRaw = rawPrisma;

export const prisma = organizationId
  ? (globalForPrisma.prismaTenant ??= withTenant(rawPrisma, organizationId))
  : rawPrisma;

if (process.env.NODE_ENV !== "production" && organizationId) {
  globalForPrisma.prismaTenant = prisma as ReturnType<typeof withTenant>;
}
