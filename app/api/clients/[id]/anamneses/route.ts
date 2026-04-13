import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anamneses = await prisma.clientAnamnesis.findMany({
    where: { clientId: params.id },
    include: {
      template: { select: { id: true, name: true, fields: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(anamneses);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { templateId, answers } = body;

  if (!templateId || !answers) {
    return NextResponse.json({ error: "templateId and answers are required" }, { status: 400 });
  }

  const anamnesis = await prisma.clientAnamnesis.create({
    data: {
      clientId: params.id,
      templateId,
      answers: typeof answers === "string" ? answers : JSON.stringify(answers),
    },
    include: {
      template: { select: { id: true, name: true, fields: true } },
    },
  });

  return NextResponse.json(anamnesis);
}
