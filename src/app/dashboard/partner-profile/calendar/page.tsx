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
      pageDescription='Interne Verfügbarkeiten für anfragbare Partner-Termine'
    >
      <div className='space-y-6'>
        <div className='bg-card/95 border-border/60 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm'>
          <div className='space-y-1'>
            <div className='font-heading text-foreground text-sm font-medium tracking-tight'>
              Partner-Kalender
            </div>
            <div className='text-muted-foreground text-xs'>
              Verwalte deine internen Verfügbarkeits-Slots für das MVP.
            </div>
          </div>

          <Link
            href='/dashboard/partner-profile'
            className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-xs font-medium shadow-sm transition-colors'
          >
            Zurück zum Profil
          </Link>
        </div>

        {!profile.partnerId ? (
          <div className='bg-card/95 border-border/60 rounded-2xl border p-6 shadow-sm'>
            <div className='font-heading text-foreground text-sm font-medium tracking-tight'>
              Kalender noch nicht verfügbar
            </div>
            <div className='text-muted-foreground mt-1 text-sm'>
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
