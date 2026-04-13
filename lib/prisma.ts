import { PrismaClient } from "@/lib/generated/prisma/client";
import { withTenant } from "@/lib/prisma-tenant";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaTenant: ReturnType<typeof withTenant> | undefined;
};

/**
 * Standard PrismaClient. Prisma 7's new `prisma-client` generator
 * requires non-empty options at construction, so we pass the URL
 * explicitly. Value comes from DATABASE_URL, which the LoopTools
 * deploy engine injects with a Neon Postgres branch connection.
 */
function createPrismaClient() {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
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
