import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Cria data UTC para o início do dia local (baseado no offset do servidor).
 * Para garantir consistência, usamos UTC com a data do dia local.
 */
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = todayUTC();
  const endOfDay = new Date(today);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - today.getUTCDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const [
    todayAppointments,
    weekAppointments,
    pendingCount,
    rooms,
    totalClients,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { date: { gte: today, lte: endOfDay }, status: { not: "cancelled" } },
    }),
    prisma.appointment.count({
      where: { date: { gte: weekStart, lte: weekEnd }, status: { not: "cancelled" } },
    }),
    prisma.appointment.count({
      where: { status: "confirmed", date: { gte: today } },
    }),
    prisma.room.findMany({
      where: { active: true },
      include: {
        appointments: {
          where: { date: { gte: today, lte: endOfDay }, status: { not: "cancelled" } },
        },
      },
    }),
    prisma.client.count(),
    // Mostrar próximos agendamentos (hoje + futuros), não apenas hoje
    prisma.appointment.findMany({
      where: { date: { gte: today }, status: { not: "cancelled" } },
      include: { client: true, service: true, employee: true, room: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 10,
    }),
  ]);

  const settings = await prisma.clinicSettings.findFirst();
  const businessHours = await prisma.businessHours.findUnique({
    where: { dayOfWeek: today.getUTCDay() },
  });

  let totalMinutesInDay = 480;
  if (businessHours && businessHours.isOpen) {
    const [oh, om] = businessHours.openTime.split(":").map(Number);
    const [ch, cm] = businessHours.closeTime.split(":").map(Number);
    totalMinutesInDay = (ch * 60 + cm) - (oh * 60 + om);
  }

  const roomOccupancy = rooms.map((room) => {
    const occupiedMinutes = room.appointments.reduce((total: number, apt: { startTime: string; endTime: string }) => {
      const [sh, sm] = apt.startTime.split(":").map(Number);
      const [eh, em] = apt.endTime.split(":").map(Number);
      return total + ((eh * 60 + em) - (sh * 60 + sm));
    }, 0);

    return {
      id: room.id,
      name: room.name,
      color: room.color,
      occupancy: totalMinutesInDay > 0 ? Math.round((occupiedMinutes / totalMinutesInDay) * 100) : 0,
      appointmentCount: room.appointments.length,
    };
  });

  return NextResponse.json({
    todayAppointments,
    weekAppointments,
    pendingCount,
    totalClients,
    roomOccupancy,
    upcomingAppointments,
    clinicName: settings?.clinicName || "Clínica de Estética",
  });
}
