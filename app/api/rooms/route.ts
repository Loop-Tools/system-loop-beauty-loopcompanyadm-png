import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const rooms = await prisma.room.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, color } = body;

  const room = await prisma.room.create({
    data: { name, description, color },
  });

  return NextResponse.json(room);
}
