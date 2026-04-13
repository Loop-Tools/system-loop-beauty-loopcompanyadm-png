import type { PrismaClient } from "@/lib/generated/prisma/client";

const TENANT_MODELS = new Set([
  "User",
  "Room",
  "Employee",
  "ServiceGroup",
  "Service",
  "Client",
  "Appointment",
  "ScheduleBlock",
  "CommissionPayment",
  "ClientNote",
  "ClientFile",
  "AnamnesisTemplate",
  "ClientAnamnesis",
  "ClinicSettings",
  "BusinessHours",
  "TaskBoard",
  "Task",
]);

export function withTenant(client: PrismaClient, organizationId: string) {
  return client.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (!model || !TENANT_MODELS.has(model)) {
            return query(args);
          }

          if (
            operation === "findFirst" ||
            operation === "findFirstOrThrow" ||
            operation === "findMany" ||
            operation === "findUnique" ||
            operation === "findUniqueOrThrow" ||
            operation === "count" ||
            operation === "aggregate" ||
            operation === "groupBy"
          ) {
            args.where = { ...(args.where ?? {}), organizationId };
          }

          if (operation === "create") {
            args.data = { ...(args.data ?? {}), organizationId };
          }
          if (operation === "createMany") {
            const data = args.data;
            args.data = Array.isArray(data)
              ? data.map((d: Record<string, unknown>) => ({ ...d, organizationId }))
              : { ...data, organizationId };
          }
          if (operation === "upsert") {
            args.where = { ...(args.where ?? {}), organizationId };
            args.create = { ...(args.create ?? {}), organizationId };
          }
          if (
            operation === "update" ||
            operation === "updateMany" ||
            operation === "delete" ||
            operation === "deleteMany"
          ) {
            args.where = { ...(args.where ?? {}), organizationId };
          }

          return query(args);
        },
      },
    },
  });
}
