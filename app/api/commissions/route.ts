import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate + "T23:59:59.999Z"),
    };
  }

  const commissions = await prisma.commissionPayment.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true } },
      appointment: {
        include: {
          service: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.commissionValue, 0);

  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.commissionValue, 0);

  const totalAll = commissions.reduce((sum, c) => sum + c.commissionValue, 0);

  return NextResponse.json({
    commissions,
    summary: { totalPending, totalPaid, totalAll },
  });
}
