import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const service = await prisma.service.findUnique({
    where: { id: params.id },
    include: {
      roomServices: { include: { room: true } },
      employeeServices: { include: { employee: true } },
    },
  });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(service);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, duration, price, active, groupId, roomIds } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (duration !== undefined) updateData.duration = duration;
  if (price !== undefined) updateData.price = price;
  if (active !== undefined) updateData.active = active;
  if (groupId !== undefined) updateData.groupId = groupId || null;

  await prisma.service.update({ where: { id: params.id }, data: updateData });

  // Update room associations if provided
  if (roomIds !== undefined) {
    await prisma.roomService.deleteMany({ where: { serviceId: params.id } });
    if (roomIds.length > 0) {
      await prisma.roomService.createMany({
        data: roomIds.map((roomId: string) => ({ serviceId: params.id, roomId })),
      });
    }
  }

  const service = await prisma.service.findUnique({
    where: { id: params.id },
    include: {
      roomServices: { include: { room: true } },
      employeeServices: { include: { employee: true } },
    },
  });

  return NextResponse.json(service);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.service.update({
    where: { id: params.id },
    data: { active: false },
  });
  return NextResponse.json({ success: true });
}
