import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.clientNote.findMany({
    where: { clientId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const note = await prisma.clientNote.create({
    data: {
      clientId: params.id,
      content,
    },
  });

  return NextResponse.json(note);
}
