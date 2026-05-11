import { prisma } from '@/lib/prisma';

export type OperationalDomain = 'OTP' | 'FILE' | 'ASSIGNMENT';

export type OperationalResult =
  | 'SUCCESS'
  | 'FAILED'
  | 'DENIED'
  | 'EXPIRED'
  | 'ALREADY_DONE';

export type OperationalActorType = 'CUSTOMER' | 'PARTNER' | 'ADMIN' | 'SYSTEM';

export async function logOperationalEvent(input: {
  caseId?: string | null;
  domain: OperationalDomain;
  action: string;
  result: OperationalResult;
  actorType?: OperationalActorType | null;
  actorId?: string | null;
  message?: string | null;
  metadata?: unknown;
}) {
  try {
    return await prisma.operationalEvent.create({
      data: {
        caseId: input.caseId ?? null,
        domain: input.domain,
        action: input.action,
        result: input.result,
        actorType: input.actorType ?? null,
        actorId: input.actorId ?? null,
        message: input.message ?? null,
        metadata: input.metadata === undefined ? null : (input.metadata as any)
      },
      select: {
        id: true,
        createdAt: true
      }
    });
  } catch (error) {
    console.warn(
      `[ops-log] failed to write OperationalEvent (${input.domain}:${input.action}:${input.result})`
    );

    return null;
  }
}
