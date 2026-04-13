import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkSlotAvailability,
  calculateEndTime,
  getAvailableSlots,
  getAvailableEmployeesForService,
  getRoomsForServiceAndEmployee,
} from "@/lib/availability";

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// GET: endpoints públicos para o fluxo de agendamento
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Listar serviços ativos agrupados
  if (action === "services") {
    const groups = await prisma.serviceGroup.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: {
        services: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, duration: true, price: true },
        },
      },
    });
    // Also get services without a group
    const ungrouped = await prisma.service.findMany({
      where: { active: true, groupId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, duration: true, price: true },
    });
    return NextResponse.json({ groups, ungrouped });
  }

  // Listar funcionárias disponíveis para um serviço
  if (action === "employees") {
    const serviceId = searchParams.get("serviceId");
    if (!serviceId) return NextResponse.json({ error: "serviceId required" }, { status: 400 });

    const employees = await getAvailableEmployeesForService(serviceId);
    return NextResponse.json(
      employees.map((e) => ({ id: e.id, name: e.name, photoUrl: e.photoUrl }))
    );
  }

  // Listar salas para serviço + funcionária
  if (action === "rooms") {
    const serviceId = searchParams.get("serviceId");
    const employeeId = searchParams.get("employeeId");
    if (!serviceId || !employeeId)
      return NextResponse.json({ error: "serviceId and employeeId required" }, { status: 400 });

    const rooms = await getRoomsForServiceAndEmployee(serviceId, employeeId);
    return NextResponse.json(rooms.map((r) => ({ id: r.id, name: r.name })));
  }

  // Listar horários disponíveis para uma data
  if (action === "slots") {
    const serviceId = searchParams.get("serviceId");
    const employeeId = searchParams.get("employeeId");
    const roomId = searchParams.get("roomId");
    const dateStr = searchParams.get("date");

    if (!serviceId || !employeeId || !roomId || !dateStr) {
      return NextResponse.json(
        { error: "serviceId, employeeId, roomId and date required" },
        { status: 400 }
      );
    }

    const date = parseDate(dateStr);
    const slots = await getAvailableSlots(date, serviceId, employeeId, roomId);
    return NextResponse.json(slots);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// POST: criar agendamento público
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { serviceId, employeeId, roomId, date, startTime, clientName, clientPhone, clientEmail, notes } = body;

  // Validações
  if (!serviceId || !employeeId || !roomId || !date || !startTime || !clientName || !clientPhone) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 400 });

  const endTime = calculateEndTime(startTime, service.duration);
  const appointmentDate = parseDate(date);

  // Verificação de disponibilidade no banco (proteção contra race condition)
  const availability = await checkSlotAvailability(appointmentDate, startTime, endTime, employeeId, roomId);
  if (!availability.available) {
    return NextResponse.json(
      { error: `Horário indisponível: ${availability.reason}` },
      { status: 409 }
    );
  }

  // Buscar ou criar cliente
  let client = await prisma.client.findFirst({
    where: { phone: clientPhone },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: clientName,
        phone: clientPhone,
        email: clientEmail || null,
      },
    });
  } else {
    // Atualizar dados se necessário
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        name: clientName,
        ...(clientEmail && { email: clientEmail }),
      },
    });
  }

  // Criar agendamento
  const appointment = await prisma.appointment.create({
    data: {
      date: appointmentDate,
      startTime,
      endTime,
      clientId: client.id,
      serviceId,
      employeeId,
      roomId,
      notes: notes || null,
      price: service.price,
    },
    include: {
      client: true,
      service: true,
      employee: true,
      room: true,
    },
  });

  // Gerar link do WhatsApp
  const settings = await prisma.clinicSettings.findFirst();
  const clinicName = settings?.clinicName || "Clínica de Estética";
  const template = settings?.whatsappTemplate || "";

  const formattedDate = appointmentDate.toLocaleDateString("pt-BR");
  const whatsappMessage = template
    .replace("{nome}", clientName)
    .replace("{clinica}", clinicName)
    .replace("{data}", formattedDate)
    .replace("{horario}", startTime)
    .replace("{servico}", service.name);

  const clinicPhone = settings?.phone?.replace(/\D/g, "") || "";
  const whatsappLink = clinicPhone
    ? `https://wa.me/${clinicPhone}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return NextResponse.json({
    appointment,
    whatsappLink,
    message: "Agendamento confirmado com sucesso!",
  });
}
