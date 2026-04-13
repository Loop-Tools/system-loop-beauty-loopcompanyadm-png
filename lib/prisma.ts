import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { withTenant } from "@/lib/prisma-tenant";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaTenant: ReturnType<typeof withTenant> | undefined;
};

/**
 * PrismaClient with the Neon serverless adapter. Required because
 * Prisma 7's `prisma-client` generator no longer accepts
 * `datasourceUrl` — you must pass an adapter. The Neon adapter
 * uses HTTP/WebSocket transport which is fast on cold starts and
 * works natively with the Neon connection strings the LoopTools
 * deploy engine injects.
 */
function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
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
