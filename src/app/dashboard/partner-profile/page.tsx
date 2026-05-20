import PageContainer from '@/components/layout/page-container';
import { requireRole, isPartner } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import PartnerProfileForm from '@/features/partner-profile/components/partner-profile-form';
import PartnerCollaborationList from '@/features/partner-profile/components/partner-collaboration-list';
import { getPartnerCollaboration } from '@/features/partner-profile/lib/get-partner-collaboration';

export const runtime = 'nodejs';

export default async function PartnerProfilePage() {
  const guard = await requireRole();

  if (!guard.ok) {
    redirect('/auth/sign-in');
  }

  if (!isPartner(guard.role)) {
    redirect('/dashboard/overview');
  }

  const collaboration = await getPartnerCollaboration({
    clerkUserId: guard.userId!,
    role: guard.role as 'GUTACHTER' | 'ANWALT'
  });

  return (
    <PageContainer
      pageTitle='Partnerprofil'
      pageDescription='Verwalte deine Unternehmensdaten und deine Fallpartner'
    >
      <div className='min-w-0 space-y-6 overflow-x-auto'>
        <PartnerProfileForm />

        <div id='partner-collaboration-section'>
          <PartnerCollaborationList data={collaboration} />
        </div>

        <div
          id='partner-pricing-section'
          className='space-y-3 rounded-lg border p-6'
        >
          <div>
            <div className='text-sm font-medium'>Preispaket</div>
            <div className='text-muted-foreground text-xs'>
              Preis- und Paketlogik wird aktuell vorbereitet.
            </div>
          </div>

          <div className='text-muted-foreground rounded-md border p-4 text-sm'>
            Dieser Bereich ist bald verfügbar. Bis zur finalen Preislogik bleibt
            das Preispaket im Partnerprofil als Coming Soon sichtbar.
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
