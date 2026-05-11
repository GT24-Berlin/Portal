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

    const label = c.caseNumber ?? c.id.slice(0, 8);

    return (
      <PageContainer
        pageTitle='Profil anlegen'
        pageDescription={`Fall ${label} – bitte einmal kurz registrieren, dann kannst du fortfahren.`}
      >
        <div className='max-w-xl space-y-4 rounded-lg border p-6'>
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
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  required
                />
              </div>

              <div className='space-y-1'>
                <label className='text-sm font-medium'>Nachname *</label>
                <input
                  name='lastName'
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  required
                />
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-sm font-medium'>E-Mail *</label>
              <input
                type='email'
                name='email'
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                required
              />
            </div>

            <div className='space-y-1'>
              <label className='text-sm font-medium'>Telefon *</label>
              <input
                name='phone'
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                required
              />
            </div>

            <button
              type='submit'
              className='bg-primary text-primary-foreground inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium'
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
