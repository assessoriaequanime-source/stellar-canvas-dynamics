import { AuditAction, Prisma } from "@prisma/client";
import prisma from "./prisma";

type AuditInput = {
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

export async function createAuditLog(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      details: input.details,
    },
  });
}
