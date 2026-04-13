/**
 * Bootstrap script: creates the initial ADMIN user after a fresh
 * LoopTools provisioning. Env vars come from the deploy engine.
 *
 * Reads DATABASE_URL via prisma.config.ts — no manual adapter, no
 * hardcoded SQLite path. Works against whatever Postgres the engine
 * injected (a Neon branch in practice).
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

async function bootstrap() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME;
  const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;

  if (!email || !password || !organizationId) {
    console.log("[bootstrap] skipping — not a LoopTools instance");
    return;
  }

  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findFirst({
      where: { email, organizationId },
    });
    if (existing) {
      console.log("[bootstrap] admin user already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: name ?? email,
        role: "admin",
        organizationId,
      },
    });

    console.log(`[bootstrap] created admin ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrap().catch((e) => {
  console.error("[bootstrap] failed:", e);
  process.exit(1);
});
