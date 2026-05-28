import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import InboxList from '@/components/cases/inbox-list';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';
import { NotificationType } from '@prisma/client';
import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const metadata: Metadata = {
  title: 'Inbox'
};

type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

type AppointmentNote = {
  id: string;
  createdAt: Date;
  readAt: Date | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  caseId: string | null;
  role: string | null;
};

export default async function InboxPage() {
  try {
    const { userId } = await auth();
    if (!userId) redirect('/auth/sign-in');

    const user = await currentUser();
    const role = String(user?.publicMetadata?.role ?? '') as Role;

    const isPartner = role === 'GUTACHTER' || role === 'ANWALT';
    if (!isPartner) redirect('/dashboard'); // Admin soll hier nicht rein

    // Inbox-Notification als gelesen markieren
    await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        href: {
          in: ['/dashboard/inbox', '/dashboard/partner-profile/calendar']
        }
      },
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
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      take: 50
    });

    const appointmentNotes = (await prisma.notification.findMany({
      where: {
        userId,
        type: {
          in: [
            NotificationType.APPOINTMENT_REQUEST_CREATED,
            NotificationType.APPOINTMENT_REQUEST_CONFIRMED,
            NotificationType.APPOINTMENT_REQUEST_DECLINED,
            NotificationType.APPOINTMENT_REQUEST_ALTERNATIVE_PROPOSED
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        readAt: true,
        type: true,
        title: true,
        body: true,
        href: true,
        caseId: true,
        role: true
      }
    })) as AppointmentNote[];

    const now = new Date();

    // Lazy expire: abgelaufene PENDINGs automatisch schließen
    const expiredIds = rows
      .filter(
        (a) => a.status === 'PENDING' && a.expiresAt && a.expiresAt <= now
      )
      .map((a) => a.id);

    if (expiredIds.length > 0) {
      await prisma.caseAssignment.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' as any, active: false, activeKey: null }
      });
    }

    const visibleRows = rows.filter((a) => !expiredIds.includes(a.id));

    // ✅ Trennung: PENDING vs ACCEPTED
    const pendingRows = visibleRows.filter((a) => a.status === 'PENDING');
    const acceptedRows = visibleRows.filter((a) => a.status === 'ACCEPTED');

    return (
      <PageContainer
        pageTitle='Inbox'
        pageDescription='Dir zugewiesene Fälle (annehmen oder freigeben)'
      >
        <div className='space-y-8'>
          {appointmentNotes.length > 0 ? (
            <section className='border-border/60 bg-background/82 overflow-hidden rounded-[28px] border shadow-[var(--shadow-soft)]'>
              <div className='border-border/60 bg-muted/10 flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 md:px-6'>
                <div className='space-y-1'>
                  <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                    Terminhinweise
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    Neue oder aktualisierte Terminanfragen.
                  </div>
                </div>
                <div className='text-muted-foreground text-xs'>
                  {appointmentNotes.length} Hinweis(e)
                </div>
              </div>

              <div className='space-y-3 p-4 md:p-6'>
                {appointmentNotes.map((note) => (
                  <div
                    key={note.id}
                    className='border-border/60 bg-background/84 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'
                  >
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='space-y-1'>
                        <div className='text-foreground text-sm font-medium'>
                          {note.title}
                        </div>
                        {note.body ? (
                          <div className='text-muted-foreground text-sm'>
                            {note.body}
                          </div>
                        ) : null}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {new Intl.DateTimeFormat('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(note.createdAt)}
                      </div>
                    </div>

                    <div className='text-muted-foreground mt-2 text-xs'>
                      {note.caseId ? `Case ${note.caseId}` : '—'}
                      {note.role ? ` · ${note.role}` : ''}
                    </div>

                    {note.href ? (
                      <div className='mt-2'>
                        <Link
                          href={note.href}
                          className='text-xs font-medium underline underline-offset-4'
                        >
                          Öffnen
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className='border-border/60 bg-background/82 overflow-hidden rounded-[28px] border shadow-[var(--shadow-soft)]'>
            <div className='border-border/60 bg-muted/10 flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 md:px-6'>
              <div className='space-y-1'>
                <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                  Neue Zuweisungen
                </div>
                <div className='text-muted-foreground text-xs'>
                  Erst annehmen, dann bearbeiten.
                </div>
              </div>
              <div className='text-muted-foreground text-xs'>
                {pendingRows.length} offen
              </div>
            </div>

            <div className='p-4 md:p-6'>
              <InboxList role={role as any} rows={pendingRows as any} />
            </div>
          </section>

          <section className='border-border/60 bg-background/82 overflow-hidden rounded-[28px] border shadow-[var(--shadow-soft)]'>
            <div className='border-border/60 bg-muted/10 flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4 md:px-6'>
              <div className='space-y-1'>
                <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                  Meine aktiven Fälle
                </div>
                <div className='text-muted-foreground text-xs'>
                  Bereits angenommene Zuständigkeiten.
                </div>
              </div>
              <div className='text-muted-foreground text-xs'>
                {acceptedRows.length} aktiv
              </div>
            </div>

            <div className='p-4 md:p-6'>
              <InboxList role={role as any} rows={acceptedRows as any} />
            </div>
          </section>
        </div>
      </PageContainer>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableState
          title='Inbox ist gerade nicht verfügbar'
          description='Die Seite kann im Moment keine Daten aus der Datenbank laden.'
          retryHref='/dashboard/inbox'
          retryLabel='Erneut laden'
        />
      );
    }

    throw error;
  }
}
