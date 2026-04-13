import prismaModule from "../lib/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { PrismaClient } = prismaModule as any;

async function bootstrap() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME;
  const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;

  if (!email || !password || !organizationId) {
    console.log("[bootstrap] skipping — not a LoopTools instance");
    return;
  }

  const adapter = new PrismaBetterSqlite3({ url: path.resolve("dev.db") });
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
