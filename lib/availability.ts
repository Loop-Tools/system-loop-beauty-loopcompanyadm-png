/**
 * LÓGICA CENTRAL DE DISPONIBILIDADE — Coração do Sistema
 *
 * Este módulo implementa a dupla restrição de agendamento:
 *
 * 1. RESTRIÇÃO DE FUNCIONÁRIA: Se uma funcionária está agendada num horário,
 *    ela NÃO pode ser agendada em nenhuma outra sala no mesmo horário.
 *
 * 2. RESTRIÇÃO DE SALA: Se uma sala está ocupada num horário,
 *    nenhuma outra funcionária pode ser agendada nessa sala no mesmo horário.
 *
 * A combinação dessas duas regras garante que:
 * - Cada funcionária atende apenas um cliente por vez
 * - Cada sala é usada por apenas uma funcionária por vez
 */

import { prisma } from "@/lib/prisma";

/**
 * Converte horário string "HH:MM" para minutos desde meia-noite.
 * Ex: "09:30" → 570
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte minutos desde meia-noite para string "HH:MM".
 * Ex: 570 → "09:30"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem.
 * Intervalos são [start, end) — início inclusivo, fim exclusivo.
 */
export function timeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

/**
 * Calcula o horário de término a partir do início + duração em minutos.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = timeToMinutes(startTime);
  return minutesToTime(startMinutes + durationMinutes);
}

interface ExistingAppointment {
  startTime: string;
  endTime: string;
  employeeId: string;
  roomId: string;
  status: string;
}

/**
 * Busca todos os agendamentos ativos de uma data específica.
 */
async function getAppointmentsForDate(date: Date): Promise<ExistingAppointment[]> {
  // Normaliza a data para início/fim do dia em UTC
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        not: "cancelled",
      },
    },
    select: {
      startTime: true,
      endTime: true,
      employeeId: true,
      roomId: true,
      status: true,
    },
  });

  return appointments;
}

/**
 * Verifica se um slot específico está disponível, aplicando AMBAS as restrições.
 *
 * @param date - Data do agendamento
 * @param startTime - Horário de início (ex: "10:00")
 * @param endTime - Horário de término (ex: "11:00")
 * @param employeeId - ID da funcionária
 * @param roomId - ID da sala
 * @param excludeAppointmentId - ID do agendamento a excluir (para edição)
 * @returns { available: boolean, reason?: string }
 */
export async function checkSlotAvailability(
  date: Date,
  startTime: string,
  endTime: string,
  employeeId: string,
  roomId: string,
  excludeAppointmentId?: string
): Promise<{ available: boolean; reason?: string }> {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Buscar agendamentos que podem conflitar (mesma data, não cancelados)
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      status: { not: "cancelled" },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: {
      startTime: true,
      endTime: true,
      employeeId: true,
      roomId: true,
      employee: { select: { name: true } },
      room: { select: { name: true } },
    },
  });

  for (const apt of existingAppointments) {
    const overlaps = timeSlotsOverlap(startTime, endTime, apt.startTime, apt.endTime);
    if (!overlaps) continue;

    // RESTRIÇÃO 1: Funcionária já está ocupada nesse horário
    if (apt.employeeId === employeeId) {
      return {
        available: false,
        reason: `${apt.employee.name} já está agendada na ${apt.room.name} das ${apt.startTime} às ${apt.endTime}`,
      };
    }

    // RESTRIÇÃO 2: Sala já está ocupada nesse horário
    if (apt.roomId === roomId) {
      return {
        available: false,
        reason: `${apt.room.name} já está ocupada por ${apt.employee.name} das ${apt.startTime} às ${apt.endTime}`,
      };
    }
  }

  return { available: true };
}

/**
 * Retorna todos os horários disponíveis para um serviço + funcionária + sala em uma data.
 *
 * Fluxo:
 * 1. Obtém horário de funcionamento da clínica para o dia da semana
 * 2. Gera todos os slots possíveis baseado no intervalo configurado
 * 3. Para cada slot, verifica ambas as restrições
 * 4. Retorna apenas os slots livres
 */
export async function getAvailableSlots(
  date: Date,
  serviceId: string,
  employeeId: string,
  roomId: string
): Promise<string[]> {
  const dayOfWeek = date.getUTCDay();

  // 1. Verificar horário de funcionamento
  const businessHours = await prisma.businessHours.findUnique({
    where: { dayOfWeek },
  });

  if (!businessHours || !businessHours.isOpen) {
    return []; // Clínica fechada nesse dia
  }

  // 2. Obter duração do serviço e intervalo de slots
  const [service, settings] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.clinicSettings.findFirst(),
  ]);

  if (!service) return [];

  const slotInterval = settings?.slotInterval ?? 30;
  const openMinutes = timeToMinutes(businessHours.openTime);
  const closeMinutes = timeToMinutes(businessHours.closeTime);

  // 3. Gerar todos os possíveis horários de início
  const possibleStarts: string[] = [];
  for (let m = openMinutes; m + service.duration <= closeMinutes; m += slotInterval) {
    possibleStarts.push(minutesToTime(m));
  }

  // 4. Buscar agendamentos existentes para a data
  const existingAppointments = await getAppointmentsForDate(date);

  // 5. Filtrar horários aplicando ambas as restrições
  const availableSlots: string[] = [];

  for (const startTime of possibleStarts) {
    const endTime = calculateEndTime(startTime, service.duration);
    let isAvailable = true;

    for (const apt of existingAppointments) {
      const overlaps = timeSlotsOverlap(startTime, endTime, apt.startTime, apt.endTime);
      if (!overlaps) continue;

      // RESTRIÇÃO 1: Funcionária ocupada
      if (apt.employeeId === employeeId) {
        isAvailable = false;
        break;
      }

      // RESTRIÇÃO 2: Sala ocupada
      if (apt.roomId === roomId) {
        isAvailable = false;
        break;
      }
    }

    if (isAvailable) {
      availableSlots.push(startTime);
    }
  }

  return availableSlots;
}

/**
 * Para o fluxo público de agendamento:
 * Dado um serviço, retorna as funcionárias disponíveis
 * (que fazem esse serviço E trabalham em salas onde o serviço pode ser feito).
 */
export async function getAvailableEmployeesForService(serviceId: string) {
  // Check if service has any room associations
  const roomServiceCount = await prisma.roomService.count({
    where: { serviceId },
  });

  // If service has room associations, require employee to have access to one of those rooms
  // If no room associations, just require employee to have the service
  const employees = await prisma.employee.findMany({
    where: {
      active: true,
      employeeServices: { some: { serviceId } },
      ...(roomServiceCount > 0
        ? {
            employeeRooms: {
              some: {
                room: {
                  active: true,
                  roomServices: { some: { serviceId } },
                },
              },
            },
          }
        : {}),
    },
    include: {
      employeeRooms: {
        include: {
          room: {
            include: {
              roomServices: true,
            },
          },
        },
      },
    },
  });

  return employees;
}

/**
 * Para o fluxo público: dado um serviço e uma funcionária,
 * retorna as salas possíveis (interseção: sala faz o serviço E funcionária trabalha na sala).
 */
export async function getRoomsForServiceAndEmployee(serviceId: string, employeeId: string) {
  const rooms = await prisma.room.findMany({
    where: {
      active: true,
      roomServices: { some: { serviceId } },
      employeeRooms: { some: { employeeId } },
    },
  });

  return rooms;
}
