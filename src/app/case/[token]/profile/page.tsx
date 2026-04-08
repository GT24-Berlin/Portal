import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export default async function CaseProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
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

  const label = found.caseNumber ?? found.id.slice(0, 8);
  const customer = found.customer; // ab hier sicher vorhanden

  return (
    <div className='bg-background text-foreground min-h-[100dvh]'>
      <div className='mx-auto max-w-5xl space-y-6 px-4 py-8'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm'>
              Gutachtery24 · Case Tracker
            </p>
            <h1 className='text-2xl font-semibold'>Profil</h1>
            <p className='text-muted-foreground text-sm'>Fall {label}</p>
          </div>

          <div className='flex gap-2'>
            <Link
              href={`/case/${token}`}
              className='hover:bg-muted rounded-md border px-3 py-2 text-sm'
            >
              Fallstatus
            </Link>

            <Link
              href={`/case/${token}/profile/edit`}
              className='hover:bg-muted rounded-md border px-3 py-2 text-sm'
            >
              Bearbeiten
            </Link>

            <Link
              href={`/case/${token}/profile`}
              className='bg-foreground text-background rounded-md px-3 py-2 text-sm hover:opacity-90'
            >
              Profil
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className='bg-card space-y-4 rounded-xl border p-6'>
          {saved ? (
            <div className='rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800'>
              Profil gespeichert.
            </div>
          ) : null}

          {errorMessage ? (
            <div className='rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800'>
              {errorMessage}
            </div>
          ) : null}
          <div className='grid grid-cols-1 gap-4 text-sm md:grid-cols-2'>
            <div>
              <div className='text-muted-foreground'>Vorname</div>
              <div className='font-medium'>{customer.firstName}</div>
            </div>
            <div>
              <div className='text-muted-foreground'>Nachname</div>
              <div className='font-medium'>{customer.lastName}</div>
            </div>
            <div>
              <div className='text-muted-foreground'>E-Mail</div>
              <div className='font-medium break-all'>{customer.email}</div>
            </div>
            <div>
              <div className='text-muted-foreground'>Telefon</div>
              <div className='font-medium'>{customer.phone}</div>
            </div>
          </div>

          <div className='text-muted-foreground text-xs'>
            Bearbeiten bauen wir als nächsten Schritt (Button + Form + POST).
          </div>
        </div>
      </div>
    </div>
  );
}
