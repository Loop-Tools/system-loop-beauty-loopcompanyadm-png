import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let employeeId = searchParams.get("employeeId");

  // Auto-detect: if logged-in user is an employee, filter by their employeeId
  const user = session.user as { role?: string; employeeId?: string | null };
  if (user.role === "employee" && user.employeeId) {
    employeeId = user.employeeId;
  }

  const whereClause = employeeId
    ? {
        OR: [
          { members: { some: { employeeId } } },
          { members: { none: {} } },
        ],
      }
    : {};

  const boards = await prisma.taskBoard.findMany({
    where: whereClause,
    orderBy: { order: "asc" },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: {
          checklists: true,
          attachments: true,
          labels: true,
          comments: {
            select: { id: true },
          },
        },
      },
      members: {
        include: {
          employee: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  // Transform comments to just count
  const transformed = boards.map((board) => ({
    ...board,
    tasks: board.tasks.map((task) => ({
      ...task,
      _count: { comments: task.comments.length },
      comments: undefined,
    })),
  }));

  return NextResponse.json(transformed);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type } = body;

  if (type === "board") {
    const { name, color, memberIds } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const maxOrder = await prisma.taskBoard.aggregate({ _max: { order: true } });
    const board = await prisma.taskBoard.create({
      data: {
        name,
        color: color || "#C9A96E",
        order: (maxOrder._max.order ?? -1) + 1,
        ...(memberIds?.length
          ? {
              members: {
                create: memberIds.map((eid: string) => ({ employeeId: eid })),
              },
            }
          : {}),
      },
      include: {
        members: { include: { employee: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json(board);
  }

  if (type === "task") {
    const { boardId, title } = body;
    if (!boardId || !title) return NextResponse.json({ error: "boardId and title required" }, { status: 400 });

    const maxOrder = await prisma.task.aggregate({
      where: { boardId },
      _max: { order: true },
    });
    const task = await prisma.task.create({
      data: {
        title,
        boardId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: {
        checklists: true,
        attachments: true,
        labels: true,
      },
    });
    return NextResponse.json(task);
  }

  if (type === "checklist") {
    const { taskId, name } = body;
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

    const checklist = await prisma.taskChecklist.create({
      data: {
        taskId,
        name: name || "Checklist",
        items: "[]",
      },
    });
    return NextResponse.json(checklist);
  }

  if (type === "label") {
    const { taskId, name, color } = body;
    if (!taskId || !name) return NextResponse.json({ error: "taskId and name required" }, { status: 400 });

    const label = await prisma.taskLabel.create({
      data: {
        taskId,
        name,
        color: color || "#C9A96E",
      },
    });
    return NextResponse.json(label);
  }

  if (type === "comment") {
    const { taskId, author, content } = body;
    if (!taskId || !author || !content)
      return NextResponse.json({ error: "taskId, author and content required" }, { status: 400 });

    const comment = await prisma.taskComment.create({
      data: { taskId, author, content },
    });
    return NextResponse.json(comment);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, type, ...data } = body;

  if (!id || !type) return NextResponse.json({ error: "id and type required" }, { status: 400 });

  if (type === "board") {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.order !== undefined) updateData.order = data.order;

    // If memberIds provided, replace all members
    if (data.memberIds !== undefined) {
      await prisma.taskBoardMember.deleteMany({ where: { boardId: id } });
      if (data.memberIds.length > 0) {
        await prisma.taskBoardMember.createMany({
          data: data.memberIds.map((eid: string) => ({ boardId: id, employeeId: eid })),
        });
      }
    }

    const board = await prisma.taskBoard.update({
      where: { id },
      data: updateData,
      include: {
        members: { include: { employee: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json(board);
  }

  if (type === "task") {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.boardId !== undefined) updateData.boardId = data.boardId;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.assignee !== undefined) updateData.assignee = data.assignee;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.completed !== undefined) updateData.completed = data.completed;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        checklists: true,
        attachments: true,
        labels: true,
      },
    });
    return NextResponse.json(task);
  }

  if (type === "checklist") {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.items !== undefined) updateData.items = data.items;

    const checklist = await prisma.taskChecklist.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(checklist);
  }

  if (type === "label") {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;

    const label = await prisma.taskLabel.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(label);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, type } = body;

  if (!id || !type) return NextResponse.json({ error: "id and type required" }, { status: 400 });

  if (type === "board") {
    await prisma.taskBoard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (type === "task") {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (type === "checklist") {
    await prisma.taskChecklist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (type === "label") {
    await prisma.taskLabel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (type === "comment") {
    await prisma.taskComment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (type === "attachment") {
    const attachment = await prisma.taskAttachment.findUnique({ where: { id } });
    if (attachment) {
      // Delete file from disk
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", attachment.url);
      try {
        await fs.unlink(filePath);
      } catch {
        // File may not exist, continue
      }
      await prisma.taskAttachment.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
