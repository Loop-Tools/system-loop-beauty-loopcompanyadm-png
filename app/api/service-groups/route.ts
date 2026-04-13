import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const groups = await prisma.serviceGroup.findMany({
    where: { active: true },
    include: {
      services: {
        orderBy: { name: "asc" },
        include: {
          roomServices: {
            include: { room: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }

  // Set order to be after the last group
  const lastGroup = await prisma.serviceGroup.findFirst({
    orderBy: { order: "desc" },
  });
  const nextOrder = (lastGroup?.order ?? 0) + 1;

  const group = await prisma.serviceGroup.create({
    data: {
      name: name.trim(),
      order: nextOrder,
    },
    include: {
      services: true,
    },
  });

  return NextResponse.json(group);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name } = body;

  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }

  const group = await prisma.serviceGroup.update({
    where: { id },
    data: { name: name.trim() },
    include: {
      services: true,
    },
  });

  return NextResponse.json(group);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }

  await prisma.serviceGroup.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
