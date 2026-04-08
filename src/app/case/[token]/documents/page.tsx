import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import CaseTopNav from '@/components/case/case-top-nav';
import { CaseFileVisibility } from '@prisma/client';
import CaseFilesUploader from '@/components/case/case-files-uploader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CaseDocumentsPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const found = await prisma.case.findUnique({
    where: { token },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          otpVerifiedAt: true
        }
      }
    }
  });

  if (!found) notFound();

  // 1) Registrierung-Gate
  if (!found.customer) {
    redirect(`/case/${token}/register`);
  }

  // 2) OTP-Gate
  if (!found.customer.otpVerifiedAt) {
    redirect(`/case/${token}/verify`);
  }

  // Optional: Cookie lesen (nicht blocken)
  await cookies();

  // Nur Customer-sichtbare Files
  const files = await prisma.caseFile.findMany({
    where: {
      caseId: found.id,
      visibility: { in: [CaseFileVisibility.CUSTOMER_AND_PARTNERS] }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      uploaderType: true,
      role: true,
      category: true,
      title: true,
      filename: true,
      mimeType: true,
      size: true,
      storageKey: true
    },
    take: 200
  });

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(d));

  const fmtSize = (n?: number | null) => {
    const v = Number(n ?? 0);
    if (!v) return '—';
    if (v < 1024) return `${v} B`;
    if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
    return `${(v / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className='bg-background text-foreground min-h-[100dvh]'>
      <div className='mx-auto max-w-5xl space-y-6 px-4 py-8'>
        <CaseTopNav
          token={token}
          active='documents'
          title='Meine Dokumente'
          subtitle={`Fall ${found.caseNumber ?? found.id.slice(0, 8)} · ${found.customer.firstName} ${found.customer.lastName}`}
          showEdit={false}
        />

        <CaseFilesUploader token={token} />

        <div className='bg-card space-y-4 rounded-xl border p-6'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-semibold'>Dokumente</h2>
              <p className='text-muted-foreground text-sm'>
                Hier findest du alle Dokumente, die zu deinem Fall hochgeladen
                wurden.
              </p>
            </div>

            <Link
              href={`/case/${token}`}
              className='hover:bg-muted rounded-md border px-3 py-2 text-sm'
            >
              Zurück zum Fallstatus
            </Link>
          </div>

          {files.length === 0 ? (
            <div className='text-muted-foreground text-sm'>
              Noch keine Dokumente vorhanden.
            </div>
          ) : (
            <div className='overflow-hidden rounded-lg border'>
              <div className='grid grid-cols-12 gap-2 border-b p-3 text-sm font-medium'>
                <div className='col-span-5'>Dokument</div>
                <div className='col-span-2'>Kategorie</div>
                <div className='col-span-2'>Quelle</div>
                <div className='col-span-2'>Datum</div>
                <div className='col-span-1 text-right'>Download</div>
              </div>

              {files.map((f) => {
                const source =
                  f.uploaderType === 'CUSTOMER'
                    ? 'Du'
                    : f.role
                      ? String(f.role)
                      : String(f.uploaderType);

                return (
                  <div
                    key={f.id}
                    className='grid grid-cols-12 items-center gap-2 p-3 text-sm'
                  >
                    <div className='col-span-5'>
                      <div className='font-medium'>{f.title ?? f.filename}</div>
                      <div className='text-muted-foreground text-xs'>
                        {f.filename} · {f.mimeType ?? '—'} · {fmtSize(f.size)}
                      </div>
                    </div>

                    <div className='text-muted-foreground col-span-2'>
                      {String(f.category ?? '—')}
                    </div>

                    <div className='text-muted-foreground col-span-2'>
                      {source}
                    </div>

                    <div className='text-muted-foreground col-span-2'>
                      {fmt(f.createdAt)}
                    </div>

                    <div className='col-span-1 text-right'>
                      <a
                        className='underline underline-offset-4 hover:opacity-80'
                        href={`/api/case/${token}/files/${f.id}/download`}
                      >
                        holen
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className='text-muted-foreground text-xs'>
            Nächster Schritt: Button „An Versicherung weiterleiten“ (sendMail an
            die hinterlegte Versicherungs-E-Mail).
          </div>
        </div>
      </div>
    </div>
  );
}
