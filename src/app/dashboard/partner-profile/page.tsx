import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { requireRole, isPartner } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import PartnerProfileForm from '@/features/partner-profile/components/partner-profile-form';
import PartnerCollaborationList from '@/features/partner-profile/components/partner-collaboration-list';
import { getPartnerCollaboration } from '@/features/partner-profile/lib/get-partner-collaboration';
import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const metadata: Metadata = {
  title: 'Partnerprofil'
};

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
      <div className='min-w-0 space-y-6'>
        <section className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Partnerbereich
              </p>
              <div className='flex flex-wrap items-end justify-between gap-4'>
                <div className='max-w-3xl space-y-2'>
                  <h1 className='font-heading text-foreground text-3xl font-semibold tracking-tight md:text-4xl'>
                    Partnerprofil und Fallpartner
                  </h1>
                  <p className='text-muted-foreground text-sm leading-6 md:text-[15px]'>
                    Pflege Unternehmensdaten, verknüpfe deine Fallpartner und
                    wechsle mit einem ruhigen Produkt-Flow in den Kalender.
                  </p>
                </div>

                <div className='flex flex-wrap gap-2'>
                  <a
                    href='#partner-profile-section'
                    className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-[var(--shadow-soft)] transition-colors'
                  >
                    Profil
                  </a>
                  <a
                    href='#partner-collaboration-section'
                    className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-[var(--shadow-soft)] transition-colors'
                  >
                    Fallpartner
                  </a>
                  <Link
                    href='/dashboard/partner-profile/calendar'
                    className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-[var(--shadow-soft)] transition-colors'
                  >
                    Kalender
                  </Link>
                </div>
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Profilpflege
                </div>
                <div className='text-foreground text-sm font-medium'>
                  Kontaktdaten, Adresse und Logo in einer ruhigen Oberfläche.
                </div>
              </div>

              <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Fallpartner
                </div>
                <div className='text-foreground text-sm font-medium'>
                  {collaboration.items.length} verknüpfte Fälle im Überblick.
                </div>
              </div>

              <Link
                href='/dashboard/partner-profile/calendar'
                className='border-border/60 bg-background/82 hover:bg-background/95 flex flex-col justify-between rounded-[24px] border p-4 shadow-[var(--shadow-soft)] transition-colors'
              >
                <div className='space-y-1'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                    Kalender
                  </div>
                  <div className='text-foreground text-sm font-medium'>
                    Verfügbarkeiten und Terminanfragen produktisiert steuern.
                  </div>
                </div>
                <div className='text-muted-foreground mt-4 text-xs'>
                  Zum Terminbereich wechseln →
                </div>
              </Link>
            </div>
          </div>
        </section>

        <div className='space-y-6'>
          <PartnerProfileForm />

          <div id='partner-collaboration-section'>
            <PartnerCollaborationList data={collaboration} />
          </div>

          <div
            id='partner-pricing-section'
            className='border-border/60 bg-background/82 space-y-3 rounded-[32px] border p-6 shadow-[var(--shadow-soft)]'
          >
            <div>
              <div className='font-heading text-foreground text-sm font-semibold tracking-tight'>
                Preispaket
              </div>
              <div className='text-muted-foreground text-sm'>
                Preis- und Paketlogik wird aktuell vorbereitet.
              </div>
            </div>

            <div className='text-muted-foreground border-border/60 bg-background/84 rounded-[24px] border border-dashed p-4 text-sm shadow-[var(--shadow-soft)]'>
              Dieser Bereich ist bald verfügbar. Bis zur finalen Preislogik
              bleibt das Preispaket im Partnerprofil als Coming Soon sichtbar.
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
