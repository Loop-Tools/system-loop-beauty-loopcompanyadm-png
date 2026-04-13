import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const files = await prisma.clientFile.findMany({
    where: { clientId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(files);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const type = (formData.get("type") as string) || "image";
  const takenAt = formData.get("takenAt") as string | null;

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const clientId = params.id;
  const dir = path.join(process.cwd(), "public", "uploads", "clients", clientId);
  await mkdir(dir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}-${file.name}`;
  await writeFile(path.join(dir, filename), buffer);
  const url = `/uploads/clients/${clientId}/${filename}`;

  const clientFile = await prisma.clientFile.create({
    data: {
      clientId,
      filename,
      url,
      type,
      takenAt: takenAt ? new Date(takenAt) : null,
    },
  });

  return NextResponse.json(clientFile);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  const file = await prisma.clientFile.findFirst({
    where: { id: fileId, clientId: params.id },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Delete file from disk
  try {
    const filePath = path.join(process.cwd(), "public", file.url);
    await unlink(filePath);
  } catch {
    // File may already be deleted from disk, continue with DB cleanup
  }

  // Delete DB record
  await prisma.clientFile.delete({ where: { id: fileId } });

  return NextResponse.json({ success: true });
}
