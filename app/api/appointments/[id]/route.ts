import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkSlotAvailability, calculateEndTime } from "@/lib/availability";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      service: true,
      employee: true,
      room: true,
      commissionPayment: true,
    },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(appointment);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status, date, startTime, serviceId, employeeId, roomId, notes } = body;

  // If rescheduling (date/time/service/employee/room changed), check availability
  if (date && startTime && serviceId && employeeId && roomId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 400 });

    const endTime = calculateEndTime(startTime, service.duration);
    const appointmentDate = new Date(date);

    const availability = await checkSlotAvailability(
      appointmentDate, startTime, endTime, employeeId, roomId, params.id
    );
    if (!availability.available) {
      return NextResponse.json({ error: availability.reason }, { status: 409 });
    }

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: { date: appointmentDate, startTime, endTime, serviceId, employeeId, roomId, notes, status },
      include: { client: true, service: true, employee: true, room: true },
    });
    return NextResponse.json(appointment);
  }

  // Update only status/notes
  const appointment = await prisma.appointment.update({
    where: { id: params.id },
    data: { ...(status && { status }), ...(notes !== undefined && { notes }) },
    include: { client: true, service: true, employee: true, room: true },
  });

  // When status changes to "completed", auto-create commission payment
  if (status === "completed") {
    const existing = await prisma.commissionPayment.findUnique({
      where: { appointmentId: params.id },
    });

    if (!existing) {
      // Get commission rate from the service's group
      const service = await prisma.service.findUnique({
        where: { id: appointment.serviceId },
        select: { groupId: true },
      });

      let commissionRate = 0;
      if (service?.groupId) {
        const groupCommission = await prisma.employeeGroupCommission.findUnique({
          where: {
            employeeId_serviceGroupId: {
              employeeId: appointment.employeeId,
              serviceGroupId: service.groupId,
            },
          },
        });
        commissionRate = groupCommission?.commissionRate ?? 0;
      }

      // Use appointment price if set, otherwise fall back to service price
      const servicePrice = appointment.price ?? appointment.service.price ?? 0;
      const commissionValue = (servicePrice * commissionRate) / 100;

      // Also update appointment price if it was null
      if (appointment.price === null && servicePrice > 0) {
        await prisma.appointment.update({
          where: { id: params.id },
          data: { price: servicePrice },
        });
      }

      if (commissionRate > 0 && servicePrice > 0) {
        await prisma.commissionPayment.create({
          data: {
            employeeId: appointment.employeeId,
            appointmentId: params.id,
            servicePrice,
            commissionRate,
            commissionValue,
            status: "pending",
          },
        });
      }
    }
  }

  return NextResponse.json(appointment);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const permanent = searchParams.get("permanent") === "true";

  if (permanent) {
    // Permanently delete appointment and associated commission
    await prisma.commissionPayment.deleteMany({ where: { appointmentId: params.id } });
    await prisma.appointment.delete({ where: { id: params.id } });
  } else {
    await prisma.appointment.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });
  }

  return NextResponse.json({ success: true });
}
