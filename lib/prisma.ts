import { PrismaClient } from "@/lib/generated/prisma/client";
import { withTenant } from "@/lib/prisma-tenant";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaTenant: ReturnType<typeof withTenant> | undefined;
};

/**
 * Standard PrismaClient — no adapter. Reads DATABASE_URL via
 * prisma.config.ts, which the LoopTools deploy engine injects with
 * a Neon Postgres branch connection string.
 */
function createPrismaClient() {
  return new PrismaClient();
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
