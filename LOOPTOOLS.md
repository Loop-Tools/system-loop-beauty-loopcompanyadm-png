# LoopTools Setup Guide

Este ficheiro prepara o teu sistema para ser publicado no marketplace
LoopTools. Cola o comando abaixo no Claude Code, Cursor ou Windsurf e
o setup é feito automaticamente.

---

## Comando de Setup

```
Lê este ficheiro LOOPTOOLS.md na íntegra e executa o LoopTools Setup
no meu projecto. Segue cada passo na ordem indicada, sem pular
nenhum. Confirma quando cada passo estiver concluído.
```

---

## O que o Setup faz

O LoopTools usa um modelo **multi-tenant** — vários compradores usam
o mesmo sistema mas com dados completamente isolados. O isolamento é
obrigatório e pode ser implementado em qualquer stack (Supabase,
Prisma + SQLite/Postgres/MySQL, Drizzle, raw SQL, etc.).

O requisito é: **toda query à base de dados tem que ser filtrada por
`organization_id`**. Como garantes isso depende da tua stack.

---

## Passo 1 — Análise do projecto

Identifica:

- Todas as tabelas/modelos existentes
- Stack técnica (Next.js + Supabase, Prisma + SQLite, Drizzle, etc.)
- Auth (Supabase Auth, NextAuth, Clerk, custom…)
- Se já existe um campo `organization_id` em alguma tabela

Escolhe a abordagem correcta do Passo 2 conforme a stack:

| Stack | Abordagem recomendada |
|---|---|
| Supabase + Postgres | RLS (Row Level Security) — opção A |
| Prisma (qualquer DB) | Middleware de Prisma — opção B |
| Drizzle | Filtro automático via helper — opção C |
| Raw SQL / outros | Garantir WHERE organization_id em todas as queries |

---

## Passo 2 — Implementar multi-tenancy

### Opção A — Supabase + Postgres (RLS)

Cria `supabase/migrations/looptools_multitenancy.sql`:

```sql
-- Adiciona organization_id a todas as tabelas do tenant
alter table public.TABELA_1
  add column if not exists organization_id uuid;

-- Função helper: devolve o organization_id do request actual
create or replace function public.get_organization_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb->>'organization_id',
    (current_setting('request.headers', true)::jsonb)->>'x-organization-id'
  )::uuid;
$$;

-- Activa RLS e policies em cada tabela
alter table public.TABELA_1 enable row level security;
create policy "tenant_select" on public.TABELA_1
  for select using (organization_id = public.get_organization_id());
create policy "tenant_insert" on public.TABELA_1
  for insert with check (organization_id = public.get_organization_id());
create policy "tenant_update" on public.TABELA_1
  for update using (organization_id = public.get_organization_id());
create policy "tenant_delete" on public.TABELA_1
  for delete using (organization_id = public.get_organization_id());
```

### Opção B — Prisma + qualquer DB (SQLite, Postgres, MySQL)

1. Adiciona `organizationId` ao schema e cria migration:

```prisma
model Cliente {
  id             String @id @default(cuid())
  organizationId String
  // ... outros campos

  @@index([organizationId])
}
```

```bash
npx prisma migrate dev --name add_organization_id
```

2. Cria `src/lib/prisma-tenant.ts` com middleware que força o filtro:

```ts
import { PrismaClient } from "@prisma/client";

const TENANT_MODELS = ["Cliente", "Projecto", "Tarefa"]; // adapta

export function tenantPrisma(organizationId: string) {
  const client = new PrismaClient();
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.includes(model)) {
            return query(args);
          }

          // Reads — inject WHERE organization_id
          if (
            operation === "findFirst" ||
            operation === "findMany" ||
            operation === "findUnique" ||
            operation === "count" ||
            operation === "aggregate"
          ) {
            args.where = { ...args.where, organizationId };
          }

          // Writes — inject on data and WHERE
          if (operation === "create") {
            args.data = { ...args.data, organizationId };
          }
          if (operation === "createMany") {
            args.data = (args.data as any[]).map((d) => ({
              ...d,
              organizationId,
            }));
          }
          if (
            operation === "update" ||
            operation === "updateMany" ||
            operation === "delete" ||
            operation === "deleteMany"
          ) {
            args.where = { ...args.where, organizationId };
          }

          return query(args);
        },
      },
    },
  });
}
```

3. Em cada route/server-action, usa `tenantPrisma(orgId)` em vez de
`prisma` directo:

```ts
import { tenantPrisma } from "@/lib/prisma-tenant";

export async function getClientes() {
  const db = tenantPrisma(process.env.NEXT_PUBLIC_ORGANIZATION_ID!);
  return db.cliente.findMany();
}
```

### Opção C — Drizzle

Cria um helper que injecta `organizationId` automaticamente:

```ts
import { eq, and, type SQL } from "drizzle-orm";

const orgId = process.env.NEXT_PUBLIC_ORGANIZATION_ID!;

export function tenantWhere(extra?: SQL) {
  const base = eq(clientes.organizationId, orgId);
  return extra ? and(base, extra) : base;
}

// Uso:
await db.select().from(clientes).where(tenantWhere());
await db.insert(clientes).values({ ...data, organizationId: orgId });
```

### Opção D — Raw SQL / outros

Garante que **todas** as queries incluem `WHERE organization_id = ?`.
Considera encapsular num helper único para não esqueceres em nenhum
ponto.

---

## Passo 3 — Variáveis de ambiente

Adiciona ao `.env.example` (criar se não existir):

```
# LoopTools — injectado automaticamente no provisioning
NEXT_PUBLIC_ORGANIZATION_ID=
NEXT_PUBLIC_ORGANIZATION_NAME=
NEXT_PUBLIC_ORGANIZATION_SLUG=
NEXT_PUBLIC_LOOPTOOLS_SYSTEM=true

# Admin inicial — LoopTools injecta com os dados do comprador.
# O teu sistema deve criar um user admin com estes dados na
# primeira inicialização (ver Passo 5b).
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
INITIAL_ADMIN_NAME=
```

**Se usas Supabase**, adiciona também:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Se usas Prisma + SQLite**, basta manter o teu `DATABASE_URL`
existente. LoopTools não interfere com isso.

Outras variáveis que o teu sistema precisa (API keys, etc.) devem
estar no `.env.example` também — os compradores vão configurá-las
no painel da Vercel após o deploy.

---

## Passo 4 — Cliente Supabase

Cria/actualiza `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function getOrganizationId(): string {
  return process.env.NEXT_PUBLIC_ORGANIZATION_ID ?? "";
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          "x-organization-id": getOrganizationId(),
        },
      },
    }
  );
}
```

No servidor (`src/lib/supabase/server.ts`), passa o mesmo header
em todos os pedidos.

Em todas as queries de **INSERT**, passa sempre
`organization_id: getOrganizationId()` no payload.

---

## Passo 5 — Seed de demonstração

Cria `supabase/seed.sql` com dados realistas que demonstram o
sistema. Usa o placeholder `{{ORGANIZATION_ID}}` — o LoopTools
substitui pelo UUID real do comprador:

```sql
insert into public.clientes (id, organization_id, nome)
values
  (gen_random_uuid(), '{{ORGANIZATION_ID}}', 'Cliente Demo 1'),
  (gen_random_uuid(), '{{ORGANIZATION_ID}}', 'Cliente Demo 2');
```

---

## Passo 5b — Admin inicial (OBRIGATÓRIO)

Quando o LoopTools provisiona a instância de um comprador,
injecta três variáveis com os dados de login:

- `INITIAL_ADMIN_EMAIL` — email do comprador
- `INITIAL_ADMIN_PASSWORD` — palavra-passe gerada (12 caracteres)
- `INITIAL_ADMIN_NAME` — nome do comprador

O comprador recebe estes dados por email e espera poder **fazer
login imediatamente**. O teu sistema tem que criar este user
automaticamente. Tens duas opções:

### Opção A — Prisma + NextAuth + bcrypt (stack tipo Members Flix)

Cria `scripts/bootstrap-admin.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function bootstrap() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME;
  const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;

  if (!email || !password || !organizationId) {
    console.log("[bootstrap] skipping — not a LoopTools instance");
    return;
  }

  const prisma = new PrismaClient();

  // Check if admin already exists
  const existing = await prisma.user.findFirst({
    where: { email, organizationId },
  });
  if (existing) {
    console.log("[bootstrap] admin user already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      hashedPassword,
      name: name ?? email,
      role: "admin",
      organizationId,
    },
  });

  console.log(`[bootstrap] created admin ${email}`);
  await prisma.$disconnect();
}

bootstrap().catch(console.error);
```

Adiciona ao `package.json`:

```json
"scripts": {
  "build": "prisma migrate deploy && tsx scripts/bootstrap-admin.ts && next build"
}
```

### Opção B — Supabase Auth

Se usas `@supabase/auth`, cria o user via Admin API:

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name, organization_id: organizationId },
});
```

### Opção C — Custom auth / outras stacks

Adapta o princípio: no build step do teu sistema, cria um user
administrador com os dados das env vars `INITIAL_ADMIN_*` se
ainda não existir. O importante é que o user seja criado **antes**
da primeira tentativa de login do comprador.

### Se não implementares este passo

O comprador não vai conseguir fazer login automaticamente.
Terá que usar o fluxo de "registar" ou "esqueci a senha" do
teu sistema com o email recebido.

---

## Passo 6 — looptools.config.json

Cria na **raiz** do projecto:

```json
{
  "name": "Nome do sistema",
  "slug": "nome-do-sistema",
  "description": "Descrição curta (máx. 140 caracteres)",
  "category": "Agência | Clínica | Restaurante | Estética | Outro",
  "stack": "Next.js",
  "price_monthly": 49,
  "features": [
    "Gestão de clientes",
    "Aprovação de conteúdo",
    "Relatórios"
  ],
  "env_vars_required": [
    "DATABASE_URL",
    "ANTHROPIC_API_KEY"
  ],
  "has_database": true,
  "has_seed": true,
  "multitenancy": {
    "tables_protected": ["clientes", "projectos", "tarefas"],
    "customizable_by_ai": ["labels", "cores", "módulos visíveis"],
    "not_customizable": ["lógica de negócio", "estrutura da BD"]
  }
}
```

---

## Passo 7 — Validação final

Confirma cada item:

- [ ] `organization_id` em **todas** as tabelas de tenant
- [ ] RLS activo em todas elas
- [ ] 4 policies (SELECT/INSERT/UPDATE/DELETE) por tabela
- [ ] `.env.example` completo com as 7 variáveis LoopTools
- [ ] `looptools.config.json` preenchido
- [ ] `supabase/seed.sql` com `{{ORGANIZATION_ID}}`
- [ ] Nenhum secret no repo (`.env` ignorado pelo git)
- [ ] `npm run build` sem erros

---

## Passo 8 — Commit e push

```bash
git add .
git commit -m "feat: LoopTools multi-tenancy setup"
git push origin main
```

Depois volta ao **LoopTools → Creator → GitHub** e clica
**Actualizar verificação**.
