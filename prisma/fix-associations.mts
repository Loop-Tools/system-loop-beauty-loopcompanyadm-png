import prismaModule from "../lib/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const { PrismaClient } = prismaModule as any;
const adapter = new PrismaBetterSqlite3({ url: path.resolve("dev.db") });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get all employees with their group commissions
  const employees = await prisma.employee.findMany({
    include: { employeeGroupCommissions: true },
  });

  for (const emp of employees) {
    const groupIds = emp.employeeGroupCommissions.map((gc: any) => gc.serviceGroupId);
    if (groupIds.length === 0) {
      console.log(`${emp.name}: sem grupos, ignorando`);
      continue;
    }

    // Get all services in those groups
    const services = await prisma.service.findMany({
      where: { groupId: { in: groupIds }, active: true },
      select: { id: true },
    });

    // Delete existing employee-service relations
    await prisma.employeeService.deleteMany({ where: { employeeId: emp.id } });

    // Create new ones
    if (services.length > 0) {
      await prisma.employeeService.createMany({
        data: services.map((s: any) => ({ employeeId: emp.id, serviceId: s.id })),
      });
    }

    console.log(`${emp.name}: ${services.length} serviços associados`);
  }

  console.log("\nDone!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
