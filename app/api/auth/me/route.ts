import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    let employee = null;
    if (user.employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: {
          employeeServices: {
            include: {
              service: {
                include: {
                  group: true,
                },
              },
            },
          },
          employeeRooms: {
            include: {
              room: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ user, employee });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
