import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const employees = await prisma.employee.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: {
      employeeServices: {
        include: { service: { select: { id: true, name: true, price: true } } },
      },
      employeeRooms: { include: { room: true } },
      employeeGroupCommissions: {
        include: { serviceGroup: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Check which employees have user accounts
  const userAccounts = await prisma.user.findMany({
    where: { employeeId: { not: null } },
    select: { employeeId: true, email: true },
  });
  const accountMap = new Map(userAccounts.map((u) => [u.employeeId, u.email]));

  const result = employees.map((emp) => ({
    ...emp,
    hasAccount: accountMap.has(emp.id),
    accountEmail: accountMap.get(emp.id) || null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, photoUrl, roomIds, groupCommissions } = body;

  // Auto-get services from selected groups
  const groupIds = (groupCommissions || []).map((gc: { serviceGroupId: string }) => gc.serviceGroupId);
  let serviceIds: string[] = [];
  if (groupIds.length > 0) {
    const servicesInGroups = await prisma.service.findMany({
      where: { groupId: { in: groupIds }, active: true },
      select: { id: true },
    });
    serviceIds = servicesInGroups.map((s) => s.id);
  }

  const employee = await prisma.employee.create({
    data: {
      name,
      photoUrl,
      employeeRooms: {
        create: (roomIds || []).map((roomId: string) => ({ roomId })),
      },
      employeeServices: {
        create: serviceIds.map((serviceId: string) => ({ serviceId })),
      },
      employeeGroupCommissions: {
        create: (groupCommissions || []).map((gc: { serviceGroupId: string; commissionRate: number }) => ({
          serviceGroupId: gc.serviceGroupId,
          commissionRate: gc.commissionRate ?? 0,
        })),
      },
    },
    include: {
      employeeServices: { include: { service: true } },
      employeeRooms: { include: { room: true } },
      employeeGroupCommissions: { include: { serviceGroup: true } },
    },
  });

  return NextResponse.json(employee);
}
