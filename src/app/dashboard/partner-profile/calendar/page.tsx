import Link from 'next/link';
import { redirect } from 'next/navigation';

import PageContainer from '@/components/layout/page-container';
import { requireRole, isPartner } from '@/lib/rbac';
import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';
import PartnerAvailabilityManager from '@/features/case-scheduling/components/partner-availability-manager';
import PartnerAppointmentRequestBoard from '@/features/case-scheduling/components/partner-appointment-request-board';
import { loadPartnerAppointmentRequests } from '@/features/case-scheduling/server/partner-appointment-requests';

export const runtime = 'nodejs';

export default async function PartnerProfileCalendarPage() {
  const guard = await requireRole();

  if (!guard.ok) {
    redirect('/auth/sign-in');
  }

  if (!isPartner(guard.role)) {
    redirect('/dashboard/overview');
  }

  const profile = await getPartnerProfile({
    clerkUserId: guard.userId!,
    role: guard.role as 'GUTACHTER' | 'ANWALT'
  });

  const appointmentRequests = profile.partnerId
    ? await loadPartnerAppointmentRequests(profile.partnerId)
    : [];

  return (
    <PageContainer
      pageTitle='Kalender'
      pageDescription='Interne Verfügbarkeiten und Terminsteuerung für Partner-Termine'
    >
      <div className='space-y-6'>
        <section className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
          <div className='flex flex-wrap items-end justify-between gap-4'>
            <div className='max-w-3xl space-y-2'>
              <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Partner-Kalender
              </p>
              <h1 className='font-heading text-foreground text-3xl font-semibold tracking-tight md:text-4xl'>
                Verfügbarkeiten und Terminanfragen
              </h1>
              <p className='text-muted-foreground text-sm leading-6 md:text-[15px]'>
                Pflege interne Slots, behalte offene Anfragen im Blick und
                bleibe visuell im gleichen Produktfluss wie im Kundenportal.
              </p>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Link
                href='/dashboard/partner-profile'
                className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-[var(--shadow-soft)] transition-colors'
              >
                Zum Profil
              </Link>
              <div className='border-border/60 bg-background/82 rounded-full border px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-[var(--shadow-soft)]'>
                {appointmentRequests.length} Anfrage
                {appointmentRequests.length === 1 ? '' : 'n'}
              </div>
            </div>
          </div>

          <div className='mt-6 grid gap-4 md:grid-cols-3'>
            <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Verfügbarkeiten
              </div>
              <div className='text-foreground text-sm font-medium'>
                Slots für Telefon- und Vor-Ort-Termine in einer ruhigen Surface.
              </div>
            </div>

            <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Anfragen
              </div>
              <div className='text-foreground text-sm font-medium'>
                Offene und bereits bearbeitete Terminwünsche produktisiert
                nebeneinander.
              </div>
            </div>

            <Link
              href='/dashboard/partner-profile'
              className='border-border/60 bg-background/82 hover:bg-background/95 flex flex-col justify-between rounded-[24px] border p-4 shadow-[var(--shadow-soft)] transition-colors'
            >
              <div className='space-y-1'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Zurück
                </div>
                <div className='text-foreground text-sm font-medium'>
                  Zur kompakten Profilansicht wechseln.
                </div>
              </div>
              <div className='text-muted-foreground mt-4 text-xs'>
                Partnerprofil öffnen →
              </div>
            </Link>
          </div>
        </section>

        {!profile.partnerId ? (
          <div className='border-border/60 bg-background/82 rounded-[32px] border p-6 shadow-[var(--shadow-soft)]'>
            <div className='font-heading text-foreground text-sm font-semibold tracking-tight'>
              Kalender noch nicht verfügbar
            </div>
            <div className='text-muted-foreground mt-2 text-sm leading-6'>
              Deinem Partnerprofil ist aktuell noch kein Partnerdatensatz
              zugeordnet. Sobald das hinterlegt ist, kannst du hier interne
              Verfügbarkeiten pflegen.
            </div>
          </div>
        ) : (
          <div className='space-y-6'>
            <PartnerAvailabilityManager
              defaultRole={profile.role as 'GUTACHTER' | 'ANWALT'}
            />

            <PartnerAppointmentRequestBoard
              initialRequests={appointmentRequests}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
