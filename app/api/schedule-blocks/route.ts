import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (employeeId) where.employeeId = employeeId;

  if (startDate && endDate) {
    where.startDate = { lte: new Date(endDate) };
    where.endDate = { gte: new Date(startDate) };
  }

  const blocks = await prisma.scheduleBlock.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employeeId, startDate, endDate, startTime, endTime, allDay, reason, roomId } = body;

  if (!employeeId || !startDate || !endDate) {
    return NextResponse.json({ error: "employeeId, startDate and endDate are required" }, { status: 400 });
  }

  const block = await prisma.scheduleBlock.create({
    data: {
      employeeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime: startTime || null,
      endTime: endTime || null,
      allDay: allDay ?? false,
      reason: reason || null,
      roomId: roomId || null,
    },
    include: {
      employee: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(block);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.scheduleBlock.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
