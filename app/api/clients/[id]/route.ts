import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      appointments: {
        include: { service: true, employee: true, room: true },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const completedAppointments = client.appointments.filter((a) => a.status === "completed");
  const cancelledAppointments = client.appointments.filter((a) => a.status === "cancelled");
  const totalAppointments = client.appointments.length;

  const lastCompleted = completedAppointments[0];
  const daysSinceLastVisit = lastCompleted
    ? Math.floor((Date.now() - new Date(lastCompleted.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const totalSpent = completedAppointments.reduce((sum, a) => sum + (a.price ?? 0), 0);

  const cancellationRate =
    totalAppointments > 0 ? cancelledAppointments.length / totalAppointments : 0;

  const lastAppointments = client.appointments.slice(0, 10);

  return NextResponse.json({
    ...client,
    daysSinceLastVisit,
    totalSpent,
    appointmentCount: totalAppointments,
    cancelledCount: cancelledAppointments.length,
    cancellationRate: Math.round(cancellationRate * 10000) / 100, // percentage with 2 decimals
    clientSince: client.createdAt.toISOString(),
    lastAppointments,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, address, nif, birthday, referredBy, notes, credit, cashback } = body;

  const client = await prisma.client.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(nif !== undefined && { nif }),
      ...(birthday !== undefined && { birthday: birthday ? new Date(birthday) : null }),
      ...(referredBy !== undefined && { referredBy }),
      ...(notes !== undefined && { notes }),
      ...(credit !== undefined && { credit }),
      ...(cashback !== undefined && { cashback }),
    },
  });

  return NextResponse.json(client);
}
