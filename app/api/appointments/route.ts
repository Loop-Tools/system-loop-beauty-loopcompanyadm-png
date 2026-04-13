import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkSlotAvailability, calculateEndTime } from "@/lib/availability";

/**
 * Converte string "YYYY-MM-DD" para Date UTC (início do dia).
 * Evita problemas de timezone ao interpretar datas.
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const weekStr = searchParams.get("week");
  const status = searchParams.get("status");
  const employeeId = searchParams.get("employeeId");
  const roomId = searchParams.get("roomId");
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (dateStr) {
    const startOfDay = parseDate(dateStr);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(23, 59, 59, 999);
    where.date = { gte: startOfDay, lte: endOfDay };
  }

  if (weekStr) {
    const weekStart = parseDate(weekStr);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    where.date = { gte: weekStart, lte: weekEnd };
  }

  // Se nenhum filtro de data, buscar tudo
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  if (roomId) where.roomId = roomId;

  if (search) {
    where.client = {
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ],
    };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      client: true,
      service: true,
      employee: true,
      room: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, serviceId, employeeId, roomId, date, startTime, customDuration, notes } = body;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 400 });

  const duration = customDuration && customDuration > 0 ? customDuration : service.duration;
  const endTime = calculateEndTime(startTime, duration);
  const appointmentDate = parseDate(date);

  const availability = await checkSlotAvailability(appointmentDate, startTime, endTime, employeeId, roomId);
  if (!availability.available) {
    return NextResponse.json({ error: availability.reason }, { status: 409 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      date: appointmentDate,
      startTime,
      endTime,
      clientId,
      serviceId,
      employeeId,
      roomId,
      notes,
      price: service.price,
    },
    include: {
      client: true,
      service: true,
      employee: true,
      room: true,
    },
  });

  return NextResponse.json(appointment);
}
