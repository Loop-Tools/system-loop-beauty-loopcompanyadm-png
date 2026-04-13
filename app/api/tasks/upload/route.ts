import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const taskId = formData.get("taskId") as string | null;

  if (!file || !taskId) {
    return NextResponse.json({ error: "file and taskId required" }, { status: 400 });
  }

  // Determine file type
  const isImage = file.type.startsWith("image/");
  const fileType = isImage ? "image" : "document";

  // Create upload directory
  const uploadDir = path.join(process.cwd(), "public", "uploads", "tasks", taskId);
  await mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const ext = path.extname(file.name);
  const baseName = path.basename(file.name, ext);
  const uniqueName = `${baseName}-${Date.now()}${ext}`;
  const filePath = path.join(uploadDir, uniqueName);

  // Write file to disk
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // URL relative to public
  const url = `/uploads/tasks/${taskId}/${uniqueName}`;

  // Create attachment record
  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      filename: file.name,
      url,
      type: fileType,
    },
  });

  return NextResponse.json(attachment);
}
