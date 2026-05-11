import { prisma } from '@/lib/prisma';

type NotificationType =
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_RELEASED'
  | 'ASSIGNMENT_EXPIRED';

export async function createNotification(input: {
  recipientClerkUserId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  caseId?: string | null;
}) {
  return prisma.notification.create({
    data: {
      userId: input.recipientClerkUserId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      caseId: input.caseId ?? null
    },
    select: { id: true }
  });
}
