import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { prisma } from '@/lib/prisma';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';

export const runtime = 'nodejs';

function niceError(msg: string) {
  const m = String(msg || '').toLowerCase();
  if (m.includes('email required')) return 'Bitte eine E-Mail eingeben.';
  if (m.includes('email mismatch'))
    return 'Die E-Mail passt nicht zu diesem Fall.';
  if (m.includes('no active otp')) return 'Bitte zuerst einen Code senden.';
  if (m.includes('otp expired'))
    return 'Der Code ist abgelaufen. Bitte sende einen neuen Code.';
  if (m.includes('too many attempts'))
    return 'Zu viele Versuche. Bitte später erneut versuchen.';
  if (m.includes('invalid code'))
    return 'Der Code ist ungültig. Bitte erneut versuchen.';
  if (m.includes('invalid code format'))
    return 'Bitte einen 6-stelligen Code eingeben.';
  if (m.includes('code invalid format'))
    return 'Bitte einen 6-stelligen Code eingeben.';
  if (m.includes('code format'))
    return 'Bitte einen 6-stelligen Code eingeben.';
  if (m.includes('customer not registered'))
    return 'Bitte zuerst registrieren.';
  if (m.includes('not registered')) return 'Bitte zuerst registrieren.';
  if (m.includes('case not found')) return 'Fall nicht gefunden.';
  if (m.includes('token missing')) return 'Ungültiger Link. Bitte neu öffnen.';
  return 'Aktion fehlgeschlagen. Bitte erneut versuchen.';
}

export default async function CaseVerifyPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string; sent?: string }>;
}) {
  try {
    const { token } = await params;
    const sp = (await searchParams) ?? {};
    const errorRaw = sp.error ? String(sp.error) : '';
    const errorNorm = errorRaw
      .toLowerCase()
      .replace(/[_\s]+/g, ' ')
      .trim();
    const sent = sp.sent === '1';

    const c = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        caseNumber: true,
        customer: { select: { id: true, email: true, otpVerifiedAt: true } }
      }
    });

    if (!c) redirect('/not-found');

    // falls noch nicht registriert -> register
    if (!c.customer?.id) redirect(`/case/${token}/register`);

    // falls bereits verified -> direkt tracker
    if (c.customer.otpVerifiedAt) redirect(`/case/${token}`);

    const label = c.caseNumber ?? '—';

    return (
      <PageContainer
        pageTitle='Code bestätigen'
        pageDescription={`Fall ${label} – bitte OTP bestätigen, um fortzufahren.`}
      >
        <div className='border-border/60 bg-card/95 mx-auto max-w-xl overflow-hidden rounded-[28px] border shadow-sm'>
          <div className='border-border/60 bg-muted/15 border-b p-5'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
              Kundenportal
            </div>
            <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
              Code bestätigen
            </h2>
            <p className='text-muted-foreground text-sm'>
              Fall {label} – bitte OTP bestätigen, um fortzufahren.
            </p>
          </div>

          <div className='space-y-4 p-6'>
            {/* Status Banner */}
            {errorRaw ? (
              <div className='rounded-xl border border-red-300/70 bg-red-50/80 px-3 py-2 text-sm text-red-900 shadow-sm'>
                {niceError(errorNorm)}
              </div>
            ) : sent ? (
              <div className='rounded-xl border border-emerald-300/70 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900 shadow-sm'>
                Code wurde gesendet. Bitte prüfe dein Postfach.
              </div>
            ) : null}

            <p className='text-muted-foreground text-sm'>
              Wir senden dir einen 6-stelligen Code per E-Mail. Danach kannst du
              deinen Fallstatus öffnen.
            </p>

            {/* 1) Code senden */}
            <form
              action={`/case/${token}/verify/send`}
              method='post'
              className='space-y-3'
            >
              <div className='space-y-1'>
                <label className='text-sm font-medium'>E-Mail *</label>
                <input
                  type='email'
                  name='email'
                  defaultValue={c.customer.email ?? ''}
                  className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  required
                />
              </div>

              <button
                type='submit'
                className='border-border/60 bg-background/80 hover:bg-muted inline-flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors'
              >
                Code senden
              </button>
            </form>

            <div className='bg-border h-px w-full' />

            {/* 2) Code verifizieren */}
            <form
              action={`/case/${token}/verify/submit`}
              method='post'
              className='space-y-3'
            >
              <div className='grid grid-cols-2 gap-3'>
                <div className='col-span-2 space-y-1'>
                  <label className='text-sm font-medium'>E-Mail *</label>
                  <input
                    type='email'
                    name='email'
                    defaultValue={c.customer.email ?? ''}
                    className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                    required
                  />
                </div>

                <div className='col-span-2 space-y-1'>
                  <label className='text-sm font-medium'>
                    6-stelliger Code *
                  </label>
                  <input
                    name='code'
                    inputMode='numeric'
                    pattern='[0-9]{6}'
                    maxLength={6}
                    className='bg-background/80 border-border/60 focus-visible:ring-primary/20 w-full rounded-xl border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                    placeholder='z.B. 123456'
                    required
                  />
                </div>
              </div>

              <button
                type='submit'
                className='bg-foreground text-background inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium shadow-sm'
              >
                Code bestätigen
              </button>
            </form>

            <div className='text-muted-foreground text-xs'>
              <Link
                className='underline underline-offset-4'
                href={`/case/${token}`}
              >
                Zurück (Tracker)
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const { token } = await params;
      return (
        <DatabaseUnavailableState
          title='OTP-Verifizierung ist gerade nicht verfügbar'
          description='Die Seite kann im Moment keine Daten aus der Datenbank laden.'
          retryHref={`/case/${token}/verify`}
          retryLabel='Erneut laden'
        />
      );
    }

    throw error;
  }
}
