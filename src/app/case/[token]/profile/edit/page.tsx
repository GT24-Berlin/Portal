import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export default async function CaseProfileEditPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const found = await prisma.case.findUnique({
    where: { token },
    select: {
      id: true,
      caseNumber: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          otpVerifiedAt: true
        }
      }
    }
  });

  if (!found) notFound();

  if (!found.customer?.id) redirect(`/case/${token}/register`);
  if (!found.customer.otpVerifiedAt) redirect(`/case/${token}/verify`);

  const label = found.caseNumber ?? '—';

  return (
    <div className='bg-background text-foreground min-h-[100dvh]'>
      <div className='mx-auto max-w-3xl space-y-6 px-4 py-8'>
        <div className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border shadow-[var(--shadow-glass)] backdrop-blur-xl'>
          <div className='border-border/60 bg-muted/15 grid gap-4 border-b p-5 md:grid-cols-[1.2fr_0.8fr] md:p-6'>
            <div className='space-y-1'>
              <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Gutachtery24 · Kundenportal
              </p>
              <h1 className='font-heading text-foreground text-2xl font-semibold tracking-tight'>
                Profil bearbeiten
              </h1>
              <p className='text-muted-foreground text-sm'>
                Fallnummer {label}
              </p>
            </div>
            <div className='border-border/60 bg-background/84 grid gap-2 rounded-[24px] border p-4 shadow-sm'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
                Hinweis
              </div>
              <div className='text-foreground text-sm font-medium'>
                Änderungen werden für deinen laufenden Fall übernommen.
              </div>
            </div>
          </div>

          <div className='flex flex-wrap gap-2 p-5 md:p-6'>
            <Link
              href={`/case/${token}`}
              className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors'
            >
              Fallstatus
            </Link>
            <Link
              href={`/case/${token}/profile`}
              className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors'
            >
              Profil
            </Link>
            <Link
              href={`/case/${token}/appointments`}
              className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors'
            >
              Termin planen
            </Link>
          </div>
        </div>

        <div className='border-border/60 bg-background/80 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]'>
          <div className='border-border/60 bg-muted/15 border-b p-6'>
            <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
              Formulardaten
            </div>
            <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
              Kontaktdaten aktualisieren
            </h2>
          </div>

          <div className='space-y-4 p-6'>
            <form
              action={`/case/${token}/profile/update`}
              method='post'
              className='space-y-4'
            >
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='border-border/60 bg-background/82 space-y-1.5 rounded-[24px] border p-4 shadow-sm'>
                  <label className='text-sm font-medium tracking-[-0.01em]'>
                    Vorname *
                  </label>
                  <input
                    name='firstName'
                    defaultValue={found.customer.firstName}
                    required
                    className='bg-background/85 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  />
                </div>

                <div className='border-border/60 bg-background/82 space-y-1.5 rounded-[24px] border p-4 shadow-sm'>
                  <label className='text-sm font-medium tracking-[-0.01em]'>
                    Nachname *
                  </label>
                  <input
                    name='lastName'
                    defaultValue={found.customer.lastName}
                    required
                    className='bg-background/85 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  />
                </div>

                <div className='border-border/60 bg-background/82 space-y-1.5 rounded-[24px] border p-4 shadow-sm md:col-span-2'>
                  <label className='text-sm font-medium tracking-[-0.01em]'>
                    E-Mail
                  </label>
                  <input
                    name='email'
                    defaultValue={found.customer.email}
                    readOnly
                    className='bg-background/85 border-border/60 w-full rounded-2xl border px-3 py-2.5 text-sm opacity-80 shadow-sm'
                  />
                  <p className='text-muted-foreground text-xs'>
                    E-Mail ist für den OTP-Zugang relevant und bleibt für den
                    laufenden Fall unverändert.
                  </p>
                </div>

                <div className='border-border/60 bg-background/82 space-y-1.5 rounded-[24px] border p-4 shadow-sm md:col-span-2'>
                  <label className='text-sm font-medium tracking-[-0.01em]'>
                    Telefon *
                  </label>
                  <input
                    name='phone'
                    defaultValue={found.customer.phone}
                    required
                    className='bg-background/85 border-border/60 focus-visible:ring-primary/20 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  />
                </div>
              </div>

              <div className='flex justify-end gap-2'>
                <Link
                  href={`/case/${token}/profile`}
                  className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors'
                >
                  Abbrechen
                </Link>
                <button
                  type='submit'
                  className='bg-foreground text-background rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90'
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>

        <p className='text-muted-foreground text-xs'>
          Änderungen an deiner E-Mail-Adresse würden in einem separaten
          Bestätigungsprozess abgesichert.
        </p>
      </div>
    </div>
  );
}
