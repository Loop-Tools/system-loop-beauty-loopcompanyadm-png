import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, photoUrl, active, roomIds, groupCommissions } = body;

  // Build update data — only include fields that were sent
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
  if (active !== undefined) updateData.active = active;

  // Update basic fields
  await prisma.employee.update({ where: { id: params.id }, data: updateData });

  // Update rooms if provided
  if (roomIds !== undefined) {
    await prisma.employeeRoom.deleteMany({ where: { employeeId: params.id } });
    if (roomIds.length > 0) {
      await prisma.employeeRoom.createMany({
        data: roomIds.map((roomId: string) => ({ employeeId: params.id, roomId })),
      });
    }
  }

  // Update group commissions if provided
  if (groupCommissions !== undefined) {
    await prisma.employeeGroupCommission.deleteMany({ where: { employeeId: params.id } });
    if (groupCommissions.length > 0) {
      await prisma.employeeGroupCommission.createMany({
        data: groupCommissions.map((gc: { serviceGroupId: string; commissionRate: number }) => ({
          employeeId: params.id,
          serviceGroupId: gc.serviceGroupId,
          commissionRate: gc.commissionRate ?? 0,
        })),
      });
    }

    // Auto-associate all services from selected groups
    await prisma.employeeService.deleteMany({ where: { employeeId: params.id } });
    const groupIds = groupCommissions.map((gc: { serviceGroupId: string }) => gc.serviceGroupId);
    if (groupIds.length > 0) {
      const servicesInGroups = await prisma.service.findMany({
        where: { groupId: { in: groupIds }, active: true },
        select: { id: true },
      });
      if (servicesInGroups.length > 0) {
        await prisma.employeeService.createMany({
          data: servicesInGroups.map((s) => ({ employeeId: params.id, serviceId: s.id })),
        });
      }
    }
  }

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      employeeServices: { include: { service: true } },
      employeeRooms: { include: { room: true } },
      employeeGroupCommissions: { include: { serviceGroup: true } },
    },
  });

  return NextResponse.json(employee);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.employee.update({
    where: { id: params.id },
    data: { active: false },
  });
  return NextResponse.json({ success: true });
}
