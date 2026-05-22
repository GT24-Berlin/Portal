import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';

export const runtime = 'nodejs';

export default async function CaseRegisterPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  try {
    const { token } = await params;

    const c = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        caseNumber: true,
        customer: { select: { id: true } }
      }
    });

    if (!c) notFound();

    // falls schon registriert → direkt tracker
    if (c.customer?.id) {
      redirect(`/case/${token}`);
    }

    const label = c.caseNumber ?? '—';

    return (
      <PageContainer
        pageTitle='Profil anlegen'
        pageDescription={`Fall ${label} – bitte einmal kurz registrieren, dann kannst du fortfahren.`}
      >
        <div className='border-border/60 bg-card/95 mx-auto max-w-xl overflow-hidden rounded-[28px] border shadow-sm'>
          <div className='border-border/60 bg-muted/15 border-b p-5'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
              Kundenportal
            </div>
            <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
              Profil anlegen
            </h2>
            <p className='text-muted-foreground text-sm'>
              Fall {label} – bitte einmal kurz registrieren, dann kannst du
              fortfahren.
            </p>
          </div>

          <div className='space-y-4 p-6'>
            <form
              action={`/case/${token}/register/submit`}
              method='post'
              className='space-y-3'
            >
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <label className='text-sm font-medium'>Vorname *</label>
                  <input
                    name='firstName'
                    className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                    required
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-sm font-medium'>Nachname *</label>
                  <input
                    name='lastName'
                    className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                    required
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <label className='text-sm font-medium'>E-Mail *</label>
                <input
                  type='email'
                  name='email'
                  className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  required
                />
              </div>

              <div className='space-y-1'>
                <label className='text-sm font-medium'>Telefon *</label>
                <input
                  name='phone'
                  className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  required
                />
              </div>

              <button
                type='submit'
                className='bg-foreground text-background inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium shadow-sm'
              >
                Weiter zum Fallstatus
              </button>
            </form>

            <div className='text-muted-foreground text-xs'>
              Du hast bereits einen Account?{' '}
              <Link
                className='underline underline-offset-4'
                href={`/case/${token}`}
              >
                Zurück zum Tracker
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableState
          title='Registrierung ist gerade nicht verfügbar'
          description='Die Seite kann im Moment keine Daten aus der Datenbank laden.'
          retryHref='/case'
          retryLabel='Zurück'
        />
      );
    }

    throw error;
  }
}
