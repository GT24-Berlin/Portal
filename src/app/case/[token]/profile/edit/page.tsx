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

  const label = found.caseNumber ?? found.id.slice(0, 8);

  return (
    <div className='bg-background text-foreground min-h-[100dvh]'>
      <div className='mx-auto max-w-3xl space-y-6 px-4 py-8'>
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm'>
              Gutachtery24 · Case Tracker
            </p>
            <h1 className='text-2xl font-semibold'>Profil bearbeiten</h1>
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
              href={`/case/${token}/profile`}
              className='hover:bg-muted rounded-md border px-3 py-2 text-sm'
            >
              Profil
            </Link>
          </div>
        </div>

        <div className='bg-card space-y-4 rounded-xl border p-6'>
          <form
            action={`/case/${token}/profile/update`}
            method='post'
            className='space-y-4'
          >
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-1'>
                <label className='text-sm font-medium'>Vorname *</label>
                <input
                  name='firstName'
                  defaultValue={found.customer.firstName}
                  required
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                />
              </div>

              <div className='space-y-1'>
                <label className='text-sm font-medium'>Nachname *</label>
                <input
                  name='lastName'
                  defaultValue={found.customer.lastName}
                  required
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                />
              </div>

              <div className='space-y-1 md:col-span-2'>
                <label className='text-sm font-medium'>E-Mail</label>
                <input
                  name='email'
                  defaultValue={found.customer.email}
                  readOnly
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm opacity-80'
                />
                <p className='text-muted-foreground text-xs'>
                  E-Mail ist für den OTP-Zugang relevant und wird im MVP nicht
                  geändert.
                </p>
              </div>

              <div className='space-y-1 md:col-span-2'>
                <label className='text-sm font-medium'>Telefon *</label>
                <input
                  name='phone'
                  defaultValue={found.customer.phone}
                  required
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                />
              </div>
            </div>

            <div className='flex justify-end gap-2'>
              <Link
                href={`/case/${token}/profile`}
                className='hover:bg-muted rounded-md border px-3 py-2 text-sm'
              >
                Abbrechen
              </Link>
              <button
                type='submit'
                className='bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:opacity-90'
              >
                Speichern
              </button>
            </div>
          </form>
        </div>

        <p className='text-muted-foreground text-xs'>
          Hinweis: Wenn du E-Mail-Änderung willst, bauen wir später „E-Mail
          ändern → OTP neu verifizieren“.
        </p>
      </div>
    </div>
  );
}
