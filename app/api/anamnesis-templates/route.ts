import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.anamnesisTemplate.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, fields } = body;

  if (!name || !fields) {
    return NextResponse.json({ error: "name and fields are required" }, { status: 400 });
  }

  const template = await prisma.anamnesisTemplate.create({
    data: {
      name,
      fields: typeof fields === "string" ? fields : JSON.stringify(fields),
    },
  });

  return NextResponse.json(template);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, fields } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const template = await prisma.anamnesisTemplate.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(fields && { fields: typeof fields === "string" ? fields : JSON.stringify(fields) }),
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const template = await prisma.anamnesisTemplate.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json(template);
}
