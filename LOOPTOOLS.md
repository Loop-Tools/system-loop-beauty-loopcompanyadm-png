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
garantido por `organization_id` em todas as tabelas, protegido por
Row Level Security (RLS) no Supabase.

---

## Passo 1 — Análise do projecto

Analisa o projecto actual e identifica:

- Todas as tabelas existentes (olha para `supabase/migrations/`
  ou `prisma/schema.prisma`)
- Stack técnica (Next.js, Prisma, Supabase, Drizzle, etc.)
- Se já existe um campo `organization_id` em alguma tabela
- Quais rotas/endpoints acedem à base de dados

Se o projecto já tem multi-tenancy, salta directo para o Passo 6.

---

## Passo 2 — Migration de multi-tenancy

Cria um novo ficheiro `supabase/migrations/looptools_multitenancy.sql`
com este conteúdo (adapta à lista real de tabelas do projecto):

```sql
-- Adiciona organization_id a todas as tabelas do tenant
alter table public.TABELA_1
  add column if not exists organization_id uuid;

-- Repete para cada tabela...

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

-- Activa RLS em cada tabela
alter table public.TABELA_1 enable row level security;

-- Policies por tabela
create policy "tenant_select" on public.TABELA_1
  for select using (organization_id = public.get_organization_id());
create policy "tenant_insert" on public.TABELA_1
  for insert with check (organization_id = public.get_organization_id());
create policy "tenant_update" on public.TABELA_1
  for update using (organization_id = public.get_organization_id());
create policy "tenant_delete" on public.TABELA_1
  for delete using (organization_id = public.get_organization_id());

-- Repete as 4 policies para cada tabela
```

---

## Passo 3 — Variáveis de ambiente

Adiciona ao `.env.example` (criar se não existir):

```
# LoopTools — injectado automaticamente no provisioning
NEXT_PUBLIC_ORGANIZATION_ID=
NEXT_PUBLIC_ORGANIZATION_NAME=
NEXT_PUBLIC_ORGANIZATION_SLUG=
NEXT_PUBLIC_LOOPTOOLS_SYSTEM=true

# Supabase (LoopTools partilhado)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Admin inicial — LoopTools injecta com os dados do comprador.
# O teu sistema deve criar um user admin com estes dados na
# primeira inicialização (ver Passo 5).
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
INITIAL_ADMIN_NAME=
```

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

### Opção A — Via boot script (recomendado)

Cria `scripts/bootstrap-admin.ts` que corre no primeiro boot:

```ts
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

async function bootstrap() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME;
  const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;

  if (!email || !password || !organizationId) return;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if admin already exists for this tenant
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing) return;

  // Create the admin user
  const hashedPassword = await bcrypt.hash(password, 10);
  await supabase.from("users").insert({
    email,
    password: hashedPassword,
    name: name ?? email,
    role: "admin",
    organization_id: organizationId,
  });
}

bootstrap().catch(console.error);
```

Adiciona ao `package.json`:

```json
"scripts": {
  "build": "tsx scripts/bootstrap-admin.ts && next build"
}
```

### Opção B — Via Supabase Auth (se usas Supabase Auth)

Se o teu sistema usa `supabase.auth`, cria o user via Admin API:

```ts
await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name, organization_id: organizationId },
});
```

Corre este código no build step ou numa função que é chamada
apenas no primeiro deploy.

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
