import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import CaseTopNav from '@/components/case/case-top-nav';
import { CaseFileVisibility } from '@prisma/client';
import CaseFilesUploader from '@/components/case/case-files-uploader';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';
import CaseFileDocumentBadge from '@/features/case-file-classification/components/case-file-document-badge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CaseDocumentsPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  try {
    const { token } = await params;
    if (!token) notFound();

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
            otpVerifiedAt: true
          }
        },
        intake: {
          select: {
            id: true,
            insuranceEmail: true // Fallback
          }
        }
      }
    });

    if (!found) notFound();

    // Insurance-Empfänger: bevorzugt OWN-Insurance aus CaseInsurance, Fallback: intake.insuranceEmail
    let insuranceEmail: string | null = found.intake?.insuranceEmail ?? null;

    if (found.intake?.id) {
      const own = await prisma.caseInsurance.findFirst({
        where: {
          party: 'OWN' as any,
          ownIntakeId: found.intake.id
        },
        select: { email: true }
      });

      if (own?.email) insuranceEmail = own.email;
    }

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
        visibility: {
          in: [
            CaseFileVisibility.CUSTOMER,
            CaseFileVisibility.CUSTOMER_AND_PARTNERS
          ]
        }
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
        storageKey: true,
        documentType: true,
        classificationStatus: true,
        classificationConfidence: true
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
      <div className='bg-background text-foreground h-[100dvh] overflow-y-auto'>
        <div className='mx-auto max-w-5xl space-y-6 px-4 py-8'>
          <CaseTopNav
            token={token}
            active='documents'
            title='Meine Dokumente'
            subtitle={`Fall ${found.caseNumber ?? found.id.slice(0, 8)} · ${found.customer.firstName} ${found.customer.lastName}`}
            showEdit={false}
          />

          {insuranceEmail ? (
            <div className='text-muted-foreground text-xs'>
              Insurance: {insuranceEmail}
            </div>
          ) : null}

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
              <div className='bg-card rounded-xl border p-6'>
                <p className='text-muted-foreground text-sm'>
                  Noch keine Dokumente vorhanden.
                </p>
              </div>
            ) : (
              <div className='bg-card rounded-xl border p-6'>
                <div className='mb-3 flex items-center justify-between'>
                  <h2 className='text-lg font-semibold'>Meine Dokumente</h2>
                  <p className='text-muted-foreground text-xs'>
                    {files.length} Datei(en)
                  </p>
                </div>

                <div className='space-y-2'>
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
                        className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2'
                      >
                        <div className='min-w-0'>
                          <div className='truncate font-medium'>
                            {f.title ?? f.filename}
                          </div>

                          <CaseFileDocumentBadge
                            documentType={f.documentType}
                            classificationStatus={f.classificationStatus}
                            classificationConfidence={
                              f.classificationConfidence
                            }
                          />

                          <div className='text-muted-foreground mt-0.5 text-xs'>
                            <span className='truncate'>{f.filename}</span>
                            {' · '}
                            {String(f.category ?? '—')}
                            {' · '}
                            {source}
                          </div>

                          <div className='text-muted-foreground mt-0.5 text-xs'>
                            {fmt(f.createdAt)}
                            {' · '}
                            {fmtSize(f.size)}
                            {' · '}
                            {f.mimeType ?? '—'}
                          </div>
                        </div>

                        <a
                          className='hover:bg-muted shrink-0 rounded-md border px-3 py-1.5 text-xs'
                          href={`/api/case/${token}/files/${f.id}/download`}
                          target='_blank'
                          rel='noreferrer'
                        >
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className='text-muted-foreground text-xs'>
              Nächster Schritt: Button „An Versicherung weiterleiten“ (sendMail
              an die hinterlegte Versicherungs-E-Mail).
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableState
          title='Dokumente temporär nicht verfügbar'
          description='Die Dokumentenansicht konnte gerade nicht geladen werden, weil die Datenbankverbindung aktuell nicht erreichbar ist.'
          retryHref='/dashboard/overview'
          retryLabel='Zum Dashboard'
        />
      );
    }

    throw error;
  }
}
