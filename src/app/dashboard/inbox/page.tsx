import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import InboxList from '@/components/cases/inbox-list';

export const runtime = 'nodejs';

type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

export default async function InboxPage() {
  const { userId } = await auth();
  if (!userId) redirect('/auth/sign-in');

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '') as Role;

  const isPartner = role === 'GUTACHTER' || role === 'ANWALT';
  if (!isPartner) redirect('/dashboard'); // Admin soll hier nicht rein

  await prisma.notification.updateMany({
    where: { userId, readAt: null, href: '/dashboard/inbox' },
    data: { readAt: new Date() }
  });

  // PENDING + ACCEPTED für den eingeloggten Partner
  const rows = await prisma.caseAssignment.findMany({
    where: {
      assigneeClerkUserId: userId,
      role: role as any,
      active: true,
      status: { in: ['PENDING', 'ACCEPTED'] as any }
    },
    orderBy: { assignedAt: 'desc' },
    include: {
      case: {
        include: { lead: true } // Preview Daten
      }
    },
    take: 50
  });
  const now = new Date();

  // Lazy expire: abgelaufene PENDINGs automatisch schließen
  const expiredIds = rows
    .filter((a) => a.status === 'PENDING' && a.expiresAt && a.expiresAt <= now)
    .map((a) => a.id);

  if (expiredIds.length > 0) {
    await prisma.caseAssignment.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: 'EXPIRED' as any, active: false }
    });
  }

  const visibleRows = rows.filter((a) => !expiredIds.includes(a.id));

  return (
    <PageContainer
      pageTitle='Inbox'
      pageDescription='Dir zugewiesene Fälle (annehmen oder freigeben)'
    >
      <InboxList role={role as any} rows={visibleRows as any} />
    </PageContainer>
  );
}
