import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Create or update employee account
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employeeId, email, password } = body;

  if (!employeeId || !email || !password) {
    return NextResponse.json(
      { error: "employeeId, email e password são obrigatórios" },
      { status: 400 }
    );
  }

  // Check employee exists
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
  }

  // Check if email already in use by another user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser && existingUser.employeeId !== employeeId) {
    return NextResponse.json({ error: "Este email já está em uso" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingUser && existingUser.employeeId === employeeId) {
    // Update existing account
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { email, hashedPassword, name: employee.name },
    });
  } else {
    // Check if employee already has an account
    const existingAccount = await prisma.user.findUnique({ where: { employeeId } });
    if (existingAccount) {
      await prisma.user.update({
        where: { id: existingAccount.id },
        data: { email, hashedPassword, name: employee.name },
      });
    } else {
      // Create new account
      await prisma.user.create({
        data: {
          name: employee.name,
          email,
          hashedPassword,
          role: "employee",
          employeeId,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}

// Delete employee account
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId obrigatório" }, { status: 400 });
  }

  await prisma.user.deleteMany({ where: { employeeId } });
  return NextResponse.json({ success: true });
}
