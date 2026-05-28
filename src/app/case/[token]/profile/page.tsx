import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';

export const runtime = 'nodejs';

export default async function CaseProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  try {
    const { token } = await params;
    if (!token) notFound();

    const sp = (await searchParams) ?? {};
    const saved = sp.saved === '1';
    const errorRaw = sp.error ? String(sp.error) : '';
    const errorNorm = errorRaw
      .toLowerCase()
      .replace(/[_\s]+/g, ' ')
      .trim();

    const errorMessage =
      errorNorm === 'email mismatch'
        ? 'E-Mail passt nicht zum Fall.'
        : errorNorm === 'missing fields'
          ? 'Bitte alle Pflichtfelder ausfüllen.'
          : errorNorm
            ? 'Speichern fehlgeschlagen. Bitte erneut versuchen.'
            : '';

    const found = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
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

    // 1) Registrierung-Gate
    if (!found.customer?.id) {
      redirect(`/case/${token}/register`);
    }

    // 2) OTP-Gate
    if (!found.customer.otpVerifiedAt) {
      redirect(`/case/${token}/verify`);
    }

    // Optional: Cookie lesen (nicht blocken)
    const _jar = await cookies();
    void _jar;

    const label = found.caseNumber ?? '—';
    const customer = found.customer; // ab hier sicher vorhanden

    return (
      <div className='bg-background text-foreground min-h-[100dvh]'>
        <div className='mx-auto max-w-5xl space-y-6 px-4 py-8'>
          {/* Header */}
          <div className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border shadow-[var(--shadow-glass)] backdrop-blur-xl'>
            <div className='border-border/60 bg-muted/15 grid gap-4 border-b p-5 md:grid-cols-[1.2fr_0.8fr] md:p-6'>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Gutachtery24 · Kundenportal
                </p>
                <h1 className='font-heading text-foreground text-2xl font-semibold tracking-tight'>
                  Profil
                </h1>
                <p className='text-muted-foreground text-sm'>
                  Fallnummer {label}
                </p>
              </div>
              <div className='border-border/60 bg-background/84 grid gap-2 rounded-[24px] border p-4 shadow-sm'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
                  Für dich wichtig
                </div>
                <div className='text-foreground text-sm font-medium'>
                  Deine Kontaktdaten für den laufenden Fall.
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
                href={`/case/${token}/profile/edit`}
                className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors'
              >
                Bearbeiten
              </Link>

              <Link
                href={`/case/${token}/appointments`}
                className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors'
              >
                Termin planen
              </Link>

              <Link
                href={`/case/${token}/profile`}
                className='bg-foreground text-background rounded-full px-3 py-2 text-sm shadow-sm hover:opacity-90'
              >
                Profil
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className='border-border/60 bg-background/80 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]'>
            <div className='border-border/60 bg-muted/15 border-b p-6'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Profildaten
              </div>
              <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
                Persönliche Angaben
              </h2>
            </div>

            <div className='space-y-4 p-6'>
              {saved ? (
                <div className='rounded-2xl border border-emerald-300/70 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900 shadow-sm'>
                  Profil gespeichert.
                </div>
              ) : null}

              {errorMessage ? (
                <div className='rounded-2xl border border-red-300/70 bg-red-50/80 px-3 py-2 text-sm text-red-900 shadow-sm'>
                  {errorMessage}
                </div>
              ) : null}
              <div className='grid grid-cols-1 gap-4 text-sm md:grid-cols-2'>
                <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-sm'>
                  <div className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>
                    Vorname
                  </div>
                  <div className='font-medium'>{customer.firstName}</div>
                </div>
                <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-sm'>
                  <div className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>
                    Nachname
                  </div>
                  <div className='font-medium'>{customer.lastName}</div>
                </div>
                <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-sm'>
                  <div className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>
                    E-Mail
                  </div>
                  <div className='font-medium break-all'>{customer.email}</div>
                </div>
                <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-sm'>
                  <div className='text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase'>
                    Telefon
                  </div>
                  <div className='font-medium'>{customer.phone}</div>
                </div>
              </div>

              <div className='text-muted-foreground text-xs'>
                Deine Angaben kannst du jederzeit über die Profilbearbeitung
                aktualisieren.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const { token } = await params;
      return (
        <DatabaseUnavailableState
          title='Profil ist gerade nicht verfügbar'
          description='Die Seite kann im Moment keine Daten aus der Datenbank laden.'
          retryHref={`/case/${token}/profile`}
          retryLabel='Erneut laden'
        />
      );
    }

    throw error;
  }
}
