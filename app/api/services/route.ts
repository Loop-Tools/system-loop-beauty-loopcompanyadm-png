import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const services = await prisma.service.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: {
      roomServices: { include: { room: true } },
      employeeServices: { include: { employee: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, duration, price, groupId, roomIds, employeeIds } = body;

  const service = await prisma.service.create({
    data: {
      name,
      duration,
      price,
      groupId: groupId || null,
      roomServices: {
        create: (roomIds || []).map((roomId: string) => ({ roomId })),
      },
      employeeServices: {
        create: (employeeIds || []).map((employeeId: string) => ({ employeeId })),
      },
    },
    include: {
      roomServices: { include: { room: true } },
      employeeServices: { include: { employee: true } },
    },
  });

  return NextResponse.json(service);
}
