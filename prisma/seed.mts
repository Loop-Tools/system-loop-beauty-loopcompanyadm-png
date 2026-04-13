import prismaModule from "../lib/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";

const { PrismaClient } = prismaModule as any;
const adapter = new PrismaBetterSqlite3({ url: path.resolve("dev.db") });
const prisma = new PrismaClient({ adapter });

const ORG_ID = process.env.NEXT_PUBLIC_ORGANIZATION_ID ?? "local-dev-org";

async function main() {
  console.log(`Seeding database for organization: ${ORG_ID}`);

  // 1. Admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email_organizationId: { email: "admin@clinica.com", organizationId: ORG_ID } },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@clinica.com",
      hashedPassword,
      role: "admin",
      organizationId: ORG_ID,
    },
  });
  console.log("Admin user created: admin@clinica.com / admin123");

  // 2. Clinic Settings
  await prisma.clinicSettings.upsert({
    where: { organizationId: ORG_ID },
    update: {},
    create: {
      organizationId: ORG_ID,
      clinicName: "[NOME DA CLÍNICA]",
      phone: "+351 912 345 678",
      address: "Rua Exemplo, 123 - Lisboa",
      slotInterval: 30,
      whatsappTemplate:
        "Olá {nome}! O seu agendamento na {clinica} está confirmado para {data} às {horario}. Serviço: {servico}. Aguardamos por si!",
    },
  });
  console.log("Clinic settings created");

  // 3. Business Hours
  const hours = [
    { dayOfWeek: 0, openTime: "09:00", closeTime: "18:00", isOpen: false },
    { dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 2, openTime: "09:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 3, openTime: "09:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 4, openTime: "09:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 5, openTime: "09:00", closeTime: "18:00", isOpen: true },
    { dayOfWeek: 6, openTime: "09:00", closeTime: "14:00", isOpen: true },
  ];

  for (const h of hours) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek_organizationId: { dayOfWeek: h.dayOfWeek, organizationId: ORG_ID } },
      update: h,
      create: { ...h, organizationId: ORG_ID },
    });
  }
  console.log("Business hours created");

  // 4. Rooms
  const salaDepilacao = await prisma.room.upsert({
    where: { name_organizationId: { name: "Sala de Depilação Laser", organizationId: ORG_ID } },
    update: {},
    create: { name: "Sala de Depilação Laser", description: "Sala equipada com laser de última geração", color: "#C9A96E", organizationId: ORG_ID },
  });
  const salaFacial = await prisma.room.upsert({
    where: { name_organizationId: { name: "Sala Facial", organizationId: ORG_ID } },
    update: {},
    create: { name: "Sala Facial", description: "Sala para tratamentos faciais e limpeza de pele", color: "#D4AF37", organizationId: ORG_ID },
  });
  const salaCorporal = await prisma.room.upsert({
    where: { name_organizationId: { name: "Sala Corporal", organizationId: ORG_ID } },
    update: {},
    create: { name: "Sala Corporal", description: "Sala para tratamentos corporais e drenagem", color: "#B8860B", organizationId: ORG_ID },
  });
  const salaMassagem = await prisma.room.upsert({
    where: { name_organizationId: { name: "Sala de Massagem", organizationId: ORG_ID } },
    update: {},
    create: { name: "Sala de Massagem", description: "Sala para massagens relaxantes e terapêuticas", color: "#DAA520", organizationId: ORG_ID },
  });
  console.log("Rooms created");

  // 5. Service Groups
  const grupoDepilacao = await prisma.serviceGroup.create({ data: { name: "Depilação Laser", order: 1, organizationId: ORG_ID } });
  const grupoFacial = await prisma.serviceGroup.create({ data: { name: "Tratamentos Faciais", order: 2, organizationId: ORG_ID } });
  const grupoCorporal = await prisma.serviceGroup.create({ data: { name: "Tratamentos Corporais", order: 3, organizationId: ORG_ID } });
  const grupoMassagem = await prisma.serviceGroup.create({ data: { name: "Massagens", order: 4, organizationId: ORG_ID } });
  console.log("Service groups created");

  // 6. Services (inside groups)
  const depilacaoPernas = await prisma.service.create({ data: { name: "Depilação Laser Pernas", duration: 60, price: 120.0, groupId: grupoDepilacao.id, organizationId: ORG_ID } });
  const depilacaoAxilas = await prisma.service.create({ data: { name: "Depilação Laser Axilas", duration: 30, price: 60.0, groupId: grupoDepilacao.id, organizationId: ORG_ID } });
  const limpezaPele = await prisma.service.create({ data: { name: "Limpeza de Pele", duration: 50, price: 80.0, groupId: grupoFacial.id, organizationId: ORG_ID } });
  const microagulhamento = await prisma.service.create({ data: { name: "Microagulhamento", duration: 60, price: 95.0, groupId: grupoFacial.id, organizationId: ORG_ID } });
  const drenagem = await prisma.service.create({ data: { name: "Drenagem Linfática", duration: 60, price: 75.0, groupId: grupoCorporal.id, organizationId: ORG_ID } });
  const massagemServ = await prisma.service.create({ data: { name: "Massagem Relaxante", duration: 60, price: 70.0, groupId: grupoMassagem.id, organizationId: ORG_ID } });
  console.log("Services created");

  // 7. Room-Service relations
  await prisma.roomService.createMany({
    data: [
      { roomId: salaDepilacao.id, serviceId: depilacaoPernas.id },
      { roomId: salaDepilacao.id, serviceId: depilacaoAxilas.id },
      { roomId: salaFacial.id, serviceId: limpezaPele.id },
      { roomId: salaFacial.id, serviceId: microagulhamento.id },
      { roomId: salaCorporal.id, serviceId: drenagem.id },
      { roomId: salaMassagem.id, serviceId: massagemServ.id },
    ],
  });
  console.log("Room-Service relations created");

  // 8. Employees
  const giovanna = await prisma.employee.create({ data: { name: "Giovanna", organizationId: ORG_ID } });
  const ana = await prisma.employee.create({ data: { name: "Ana", organizationId: ORG_ID } });
  const carla = await prisma.employee.create({ data: { name: "Carla", organizationId: ORG_ID } });
  console.log("Employees created");

  // 9. Employee-Room relations
  await prisma.employeeRoom.createMany({
    data: [
      { employeeId: giovanna.id, roomId: salaDepilacao.id },
      { employeeId: giovanna.id, roomId: salaFacial.id },
      { employeeId: ana.id, roomId: salaCorporal.id },
      { employeeId: ana.id, roomId: salaMassagem.id },
      { employeeId: carla.id, roomId: salaDepilacao.id },
      { employeeId: carla.id, roomId: salaFacial.id },
      { employeeId: carla.id, roomId: salaCorporal.id },
      { employeeId: carla.id, roomId: salaMassagem.id },
    ],
  });
  console.log("Employee-Room relations created");

  // 10. Employee-Service relations
  await prisma.employeeService.createMany({
    data: [
      { employeeId: giovanna.id, serviceId: depilacaoPernas.id },
      { employeeId: giovanna.id, serviceId: depilacaoAxilas.id },
      { employeeId: giovanna.id, serviceId: limpezaPele.id },
      { employeeId: giovanna.id, serviceId: microagulhamento.id },
      { employeeId: ana.id, serviceId: drenagem.id },
      { employeeId: ana.id, serviceId: massagemServ.id },
      { employeeId: carla.id, serviceId: depilacaoPernas.id },
      { employeeId: carla.id, serviceId: depilacaoAxilas.id },
      { employeeId: carla.id, serviceId: limpezaPele.id },
      { employeeId: carla.id, serviceId: microagulhamento.id },
      { employeeId: carla.id, serviceId: drenagem.id },
      { employeeId: carla.id, serviceId: massagemServ.id },
    ],
  });
  console.log("Employee-Service relations created");

  // 11. Employee-Group Commissions
  await prisma.employeeGroupCommission.createMany({
    data: [
      { employeeId: giovanna.id, serviceGroupId: grupoDepilacao.id, commissionRate: 30 },
      { employeeId: giovanna.id, serviceGroupId: grupoFacial.id, commissionRate: 25 },
      { employeeId: ana.id, serviceGroupId: grupoCorporal.id, commissionRate: 30 },
      { employeeId: ana.id, serviceGroupId: grupoMassagem.id, commissionRate: 30 },
      { employeeId: carla.id, serviceGroupId: grupoDepilacao.id, commissionRate: 25 },
      { employeeId: carla.id, serviceGroupId: grupoFacial.id, commissionRate: 20 },
      { employeeId: carla.id, serviceGroupId: grupoCorporal.id, commissionRate: 25 },
      { employeeId: carla.id, serviceGroupId: grupoMassagem.id, commissionRate: 25 },
    ],
  });
  console.log("Employee-Group commissions created");

  // 12. Anamnesis template
  await prisma.anamnesisTemplate.create({
    data: {
      organizationId: ORG_ID,
      name: "Anamnese Geral de Estética",
      fields: JSON.stringify([
        { label: "Possui alguma alergia?", type: "text", required: true },
        { label: "Está grávida ou a amamentar?", type: "select", options: ["Não", "Grávida", "A amamentar"], required: true },
        { label: "Usa alguma medicação?", type: "text", required: false },
        { label: "Já fez algum procedimento estético?", type: "textarea", required: false },
        { label: "Possui problemas de pele?", type: "select", options: ["Não", "Acne", "Rosácea", "Melasma", "Outro"], required: true },
        { label: "Exposição solar frequente?", type: "select", options: ["Sim", "Não"], required: true },
        { label: "Observações adicionais", type: "textarea", required: false },
      ]),
    },
  });
  console.log("Anamnesis template created");

  console.log("\nSeed completed!");
  console.log("Login: admin@clinica.com / admin123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
