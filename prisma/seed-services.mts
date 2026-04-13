import prismaModule from "../lib/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const { PrismaClient } = prismaModule as any;
const adapter = new PrismaBetterSqlite3({ url: path.resolve("dev.db") });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding FR Clinic services...\n");

  // Clear existing data that references services
  await prisma.commissionPayment.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.employeeService.deleteMany({});
  await prisma.roomService.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.employeeGroupCommission.deleteMany({});
  await prisma.serviceGroup.deleteMany({});
  console.log("Cleared old services and groups.\n");

  // Helper
  async function createGroup(name: string, order: number) {
    return prisma.serviceGroup.create({ data: { name, order } });
  }
  async function createService(name: string, duration: number, price: number, groupId: string) {
    return prisma.service.create({ data: { name, duration, price, groupId } });
  }

  // ═══════════════════════════════════════════
  // 1. Brow Lamination
  // ═══════════════════════════════════════════
  const g1 = await createGroup("Brow Lamination", 1);
  await createService("Brow Lamination", 60, 30, g1.id);

  // ═══════════════════════════════════════════
  // 2. Depilação a laser
  // ═══════════════════════════════════════════
  const g2 = await createGroup("Depilação a Laser", 2);
  await createService("Avaliação de Depilação a Laser", 30, 0, g2.id);
  await createService("Depilação a laser - Aureola mamária", 15, 15, g2.id);
  await createService("Depilação a laser - Axila+ virilhas cavada", 30, 25, g2.id);
  await createService("Depilação a laser - Axilas", 15, 20, g2.id);
  await createService("Depilação a laser - Axilas + Braços + Mãos", 30, 40, g2.id);
  await createService("Depilação a laser - Axilas + virilhas + perianal", 30, 35, g2.id);
  await createService("Depilação a laser - Axilas + Virilhas + Perianal + Pernas", 60, 60, g2.id);
  await createService("Depilação a laser - Axilas + Virilhas cavada +Pernas, Pés+ Gluteos", 60, 55, g2.id);
  await createService("Depilação a laser - barba completa", 25, 30, g2.id);
  await createService("Depilação a laser - Abdomén", 15, 25, g2.id);
  await createService("Depilação a laser - axilas + abdomen + virilha + perianal + pernas + pés", 60, 65, g2.id);
  await createService("Depilação a Laser - Axilas + Pernas", 60, 45, g2.id);
  await createService("Depilação a laser - Axilas + Virilha + Perianal + Pernas, Pés, Gluteos", 60, 65, g2.id);
  await createService("Depilação a laser - Braços", 30, 25, g2.id);
  await createService("Depilação a Laser - Buço", 15, 15, g2.id);
  await createService("Depilação a laser - Buço + Aureola Mamária", 15, 15, g2.id);
  await createService("Depilação a laser - Buço + Axilas", 20, 20, g2.id);
  await createService("Depilação a laser - Buço + Axilas + Pernas + Pés", 60, 45, g2.id);
  await createService("Depilação a laser - Buço + Axilas + Virilha cavada", 30, 30, g2.id);
  await createService("Depilação a laser - Buço + Axilas + Virilhas + Perianal", 30, 45, g2.id);
  await createService("Depilação a laser - Buço + Virilha + Perianal", 30, 30, g2.id);
  await createService("Depilação a laser - Buço + Virilha + Perianal + Pernas + Pés", 60, 55, g2.id);
  await createService("Depilação a laser - Buço +axilas + virilha + perianal + Pernas, Pés, Gluteos", 60, 65, g2.id);
  await createService("Depilação a laser - Buço+ axilas + virilha cavada +perianal+ pernas", 60, 55, g2.id);
  await createService("Depilação a laser - Corpo todo feminino (rosto completo, axilas, braços, mãos, abdómen, virilha, perianal, pernas, pés, glúteo, costas completas)", 120, 75, g2.id);
  await createService("Depilação a laser - Corpo todo masculino (Linha da barba,peito,abdóden,axilas,braços,mãos,virilhas,pernas,pés,glúte)", 120, 80, g2.id);
  await createService("Depilação a laser - Costas", 30, 30, g2.id);
  await createService("Depilação a laser - Gluteos", 15, 15, g2.id);
  await createService("Depilação a laser - Linha Alba", 15, 15, g2.id);
  await createService("Depilação a laser - Linha da Barba", 15, 15, g2.id);
  await createService("Depilação a laser - Linha da barba + Axilas", 20, 20, g2.id);
  await createService("Depilação a laser - Lombar", 15, 15, g2.id);
  await createService("Depilação a laser - Mãos", 15, 10, g2.id);
  await createService("Depilação a laser - Meia perna", 20, 30, g2.id);
  await createService("Depilação a laser - Meia perna + Virilha + Perianal", 45, 40, g2.id);
  await createService("Depilação a laser - Meia perna + Virilha + Perianal + Axila", 40, 50, g2.id);
  await createService("Depilação a laser - Meia perna + Virilha + Perianal + Axila + Buço", 40, 52, g2.id);
  await createService("Depilação a laser - Meia perna + Virilha + Perianal + Axila + Rosto completo", 45, 55, g2.id);
  await createService("Depilação a laser - Meia perna + Virilha + Perianal + Braço + Buço", 60, 55, g2.id);
  await createService("Depilação a laser - Meia perna+ Virilha Cavada+ Axila", 40, 40, g2.id);
  await createService("Depilação a laser - Orelhas", 15, 5, g2.id);
  await createService("Depilação a laser - Peito", 15, 20, g2.id);
  await createService("Depilação a laser - Pernas", 40, 35, g2.id);
  await createService("Depilação a laser - Pés", 15, 10, g2.id);
  await createService("Depilação a laser - Rosto completo", 15, 20, g2.id);
  await createService("Depilação a laser - Rosto Completo + Braços", 30, 45, g2.id);
  await createService("Depilação a laser - Rosto completo + virilha + perianal", 30, 35, g2.id);
  await createService("Depilação a laser - Rosto completo +axilas", 20, 25, g2.id);
  await createService("Depilação a laser - Rosto completo +axilas + virilha + perianal + Pernas, Pés, Gluteos", 60, 70, g2.id);
  await createService("Depilação a laser - Rosto completo +axilas + virilha cavada", 30, 35, g2.id);
  await createService("Depilação a laser - Tronco (Peito + Abdómen + Axilas + Costas)", 40, 45, g2.id);
  await createService("Depilação a laser - Tronco (peito, abdómen, axilas costas) + Pernas + Pés", 90, 60, g2.id);
  await createService("Depilação a laser - Tronco Plus (peito, abdómen, axilas, costas, braços)", 60, 60, g2.id);
  await createService("Depilação a laser - Tronco Plus (peito,abdómen,axilas costas, braços) + Pernas + Pés", 120, 75, g2.id);
  await createService("Depilação a laser - Virilha cavada", 15, 20, g2.id);
  await createService("Depilação a laser - Virilha Cavada + Pernas + Pés", 60, 45, g2.id);
  await createService("Depilação a laser - Virilha completa + Perianal", 30, 25, g2.id);
  await createService("Depilação a Laser - Virilha +Perianal + Pernas", 45, 45, g2.id);
  await createService("Depilação a laser- Axilas +Braços + Virilha Cavada + Perna + Pés", 90, 70, g2.id);
  await createService("Depilação a laser- Buço + Axilas + Abdomen Completo + Virilha + Perianal", 30, 45, g2.id);
  await createService("Depilação a laser- buço + virilha cavada + glúteos", 30, 35, g2.id);
  await createService("Depilação a laser- Tronco (Peito + Axilas + Abdômen) + virilha cavada+ Pernas + Pés", 90, 75, g2.id);
  await createService("Depilação Laser - Tronco plus + linha barba", 60, 65, g2.id);
  await createService("Meia perna + Axilas", 45, 40, g2.id);

  // ═══════════════════════════════════════════
  // 3. Eletrólise
  // ═══════════════════════════════════════════
  const g3 = await createGroup("Eletrólise", 3);
  await createService("Avaliação de eletrólise", 30, 20, g3.id);
  await createService("Eletrólise (Áreas Grandes)", 70, 60, g3.id);
  await createService("Eletrólise (Areas pequenas)", 40, 35, g3.id);

  // ═══════════════════════════════════════════
  // 4. Epilação a linha
  // ═══════════════════════════════════════════
  const g4 = await createGroup("Epilação a Linha", 4);
  await createService("Design de Sobrancelhas a linha", 30, 15, g4.id);
  await createService("Design de Sobrancelhas com Henna", 45, 25, g4.id);
  await createService("Epilação a linha - Buço", 15, 10, g4.id);
  await createService("Meio braço + buço + queixo", 40, 30, g4.id);

  // ═══════════════════════════════════════════
  // 5. Extensão de pestanas
  // ═══════════════════════════════════════════
  const g5 = await createGroup("Extensão de Pestanas", 5);
  await createService("Extensão de Pestanas - Fio a Fio", 90, 30, g5.id);
  await createService("Extensão de Pestanas - Mega Volume Brasileiro", 120, 40, g5.id);
  await createService("Extensão de pestanas - Volume Brasileiro", 90, 35, g5.id);
  await createService("Extensão de Pestanas- Mega Volume Egípcio", 120, 40, g5.id);

  // ═══════════════════════════════════════════
  // 6. Lifting de pestanas
  // ═══════════════════════════════════════════
  const g6 = await createGroup("Lifting de Pestanas", 6);
  await createService("Lifting de Pestanas", 90, 40, g6.id);

  // ═══════════════════════════════════════════
  // 7. Limpeza de pele
  // ═══════════════════════════════════════════
  const g7 = await createGroup("Limpeza de Pele", 7);
  await createService("Limpeza de Pele", 120, 70, g7.id);
  await createService("Limpeza de Pele - Costas", 120, 120, g7.id);
  await createService("Limpeza de Pele + Dermaplening", 135, 95, g7.id);
  await createService("Limpeza de pele + HidraGloss + Dermaplening", 180, 130, g7.id);
  await createService("Limpeza de Pele+ Hidragloss", 150, 90, g7.id);

  // ═══════════════════════════════════════════
  // 8. Microagulhamento
  // ═══════════════════════════════════════════
  const g8 = await createGroup("Microagulhamento", 8);
  await createService("01 Microagulhamento + 01 Peeling Inteligente", 120, 100, g8.id);
  await createService("Avaliação Pós Microagulhamento", 15, 0, g8.id);
  await createService("Hidra Gloss", 60, 40, g8.id);
  await createService("Microagulhamento Corporal - 1 Zona", 60, 45, g8.id);
  await createService("Microagulhamento Facial + Cabine LED", 60, 50, g8.id);
  await createService("Microagulhamento Micropigmentação", 30, 40, g8.id);
  await createService("Protocolo HAIR GLOW", 90, 120, g8.id);

  // ═══════════════════════════════════════════
  // 9. Remoção de tatuagem
  // ═══════════════════════════════════════════
  const g9 = await createGroup("Remoção de Tatuagem", 9);
  await createService("Avaliação de Remoção de Micropigmentação", 30, 20, g9.id);
  await createService("Avaliação Remoção de Tatuagem", 30, 20, g9.id);
  await createService("Remoção de tatuagem Grande", 60, 160, g9.id);
  await createService("Remoção de tatuagem Média", 60, 140, g9.id);
  await createService("Remoção de tatuagem Micro", 30, 50, g9.id);
  await createService("Remoção de tatuagem Mini", 60, 100, g9.id);
  await createService("Remoção de tatuagem Pequena", 60, 120, g9.id);
  await createService("Remoção Micropigmentação Sobrancelhas", 40, 60, g9.id);
  await createService("Remoção Micropigmentação Sobrancelhas Orange Expel", 60, 75, g9.id);
  await createService("Reparação Tecidual", 30, 40, g9.id);

  // ═══════════════════════════════════════════
  // 10. Tratamentos Capilares
  // ═══════════════════════════════════════════
  const g10 = await createGroup("Tratamentos Capilares", 10);
  await createService("Avaliação Capilar Integrativa", 60, 90, g10.id);
  await createService("Protocolo de Modulação Androgénica Folicular", 60, 110, g10.id);
  await createService("Protocolo de Reativação Anágena", 60, 110, g10.id);
  await createService("Protocolo de Reequilíbrio do Microambiente Cutâneo", 60, 95, g10.id);
  await createService("Protocolo de Regeneração e Suporte Folicular", 60, 95, g10.id);

  // ═══════════════════════════════════════════
  // 11. Tratamentos Faciais
  // ═══════════════════════════════════════════
  const g11 = await createGroup("Tratamentos Faciais", 11);
  await createService("Avaliação Facial", 30, 20, g11.id);
  await createService("Black Peel", 60, 60, g11.id);
  await createService("Dermaplaning", 60, 40, g11.id);
  await createService("Fios de Seda", 60, 50, g11.id);
  await createService("Peeling Inteligente", 30, 30, g11.id);
  await createService("Peeling Inteligente para Manchas", 60, 50, g11.id);
  await createService("Radiofrequencia Facial", 60, 30, g11.id);
  await createService("Revita brow", 60, 65, g11.id);
  await createService("Spa Facial", 60, 40, g11.id);

  // ═══════════════════════════════════════════
  // 12. Tratamentos Corporais
  // ═══════════════════════════════════════════
  const g12 = await createGroup("Tratamentos Corporais", 12);
  await createService("Avaliação corporal", 15, 20, g12.id);
  await createService("Avaliação pós criolipolise", 15, 0, g12.id);
  await createService("Avaliação tratamento de estrias (Microrenova)", 30, 20, g12.id);
  await createService("Cabine LED + Esfoliação - 1 Zona", 60, 25, g12.id);
  await createService("Criolipolise - abdómen completo + inferior de glúteo", 270, 400, g12.id);
  await createService("Criolipolise - abdómen completo (superior e inferior ao umbigo + flancos)", 240, 350, g12.id);
  await createService("Criolipolise - abdómen frente (superior e inferior umbigo)", 120, 100, g12.id);
  await createService("Criolipolise - inferior de gluteo OU interior da coxa", 120, 120, g12.id);
  await createService("Drenagem + Cavitação", 90, 270, g12.id);
  await createService("Drenagem linfática + Drenagem e modeladora facial", 75, 60, g12.id);
  await createService("Drenagem linfática + Drenagem e modeladora facial - 4 sessões", 75, 230, g12.id);
  await createService("Drenagem linfática e modeladora facial", 30, 25, g12.id);
  await createService("Drenagem linfática e modeladora facial - 4 sessões", 30, 85, g12.id);
  await createService("Drenagem Linfática Manual", 60, 50, g12.id);
  await createService("Drenagem Linfática Manual - 4 sessões", 60, 160, g12.id);
  await createService("Drenagem para Gestantes", 60, 50, g12.id);
  await createService("Drenagem+cavitação", 90, 70, g12.id);
  await createService("Massagem Relaxante", 75, 55, g12.id);
  await createService("Microrenova - tratamento de estrias (zona grande)", 120, 250, g12.id);
  await createService("Microrenova - tratamento de estrias (zona média)", 90, 180, g12.id);
  await createService("Microrenova - tratamento de estrias (zona pequena)", 60, 100, g12.id);
  await createService("Peeling Inteligente nas Axilas", 30, 20, g12.id);
  await createService("Pressoterapia", 30, 20, g12.id);
  await createService("Pressoterapia - 3 sessões", 40, 60, g12.id);
  await createService("PureNail Laser Therapy (Dois pés)", 30, 35, g12.id);
  await createService("PureNail Laser Therapy (Uma unha)", 30, 20, g12.id);
  await createService("StriaGlowTherapy Protocolo para Estrias PLUS", 70, 55, g12.id);

  // Count
  const totalGroups = await prisma.serviceGroup.count();
  const totalServices = await prisma.service.count();
  console.log(`\n✅ Created ${totalGroups} groups with ${totalServices} services total.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
