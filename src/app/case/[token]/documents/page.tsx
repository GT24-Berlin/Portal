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

    const customerName = [found.customer.firstName, found.customer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return (
      <div className='bg-background text-foreground h-[100dvh] overflow-y-auto'>
        <div className='mx-auto max-w-5xl space-y-6 px-4 py-8'>
          <CaseTopNav
            token={token}
            active='documents'
            title='Meine Dokumente'
            subtitle={`Fallnummer ${found.caseNumber ?? '—'} · ${
              customerName || 'Kunde'
            }`}
            showEdit={false}
          />

          <section className='border-border/60 bg-card/95 grid gap-3 rounded-[28px] border p-5 shadow-sm md:grid-cols-3'>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Für dich wichtig
              </div>
              <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
                Dokumente sicher gesammelt
              </div>
              <div className='text-muted-foreground text-sm'>
                Alles rund um deinen Fall in einer ruhigen Übersicht.
              </div>
            </div>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Status
              </div>
              <div className='text-foreground text-sm font-medium'>
                Fallnummer {found.caseNumber ?? '—'}
              </div>
            </div>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Service
              </div>
              <div className='text-foreground text-sm font-medium'>
                {customerName || 'Kunde'}
              </div>
            </div>
          </section>

          {insuranceEmail ? (
            <div className='border-border/60 bg-muted/10 text-muted-foreground rounded-full border px-3 py-2 text-xs shadow-sm'>
              Versicherung: {insuranceEmail}
            </div>
          ) : null}

          <CaseFilesUploader token={token} />

          <div className='border-border/60 bg-card/95 overflow-hidden rounded-[28px] border shadow-sm'>
            <div className='border-border/60 bg-muted/15 flex items-center justify-between gap-3 border-b p-6 pb-4'>
              <div>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Dokumentenbereich
                </div>
                <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
                  Dokumente
                </h2>
                <p className='text-muted-foreground text-sm'>
                  Hier findest du alle Dokumente, die zu deinem Fall hochgeladen
                  wurden.
                </p>
              </div>

              <Link
                href={`/case/${token}`}
                className='hover:bg-muted border-border/60 bg-background/80 rounded-full border px-3 py-2 text-sm shadow-sm transition-colors'
              >
                Zurück zum Fallstatus
              </Link>
            </div>

            <div className='space-y-4 p-6'>
              {files.length === 0 ? (
                <div className='border-border/60 bg-muted/10 rounded-2xl border border-dashed p-6 shadow-sm'>
                  <p className='text-muted-foreground text-sm'>
                    Noch keine Dokumente vorhanden.
                  </p>
                </div>
              ) : (
                <div className='border-border/60 bg-muted/10 rounded-2xl border p-5 shadow-sm'>
                  <div className='mb-3 flex items-center justify-between'>
                    <h2 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
                      Meine Dokumente
                    </h2>
                    <p className='text-muted-foreground text-xs tracking-[0.12em] uppercase'>
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
                          className='border-border/60 bg-background/80 hover:bg-muted/20 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-colors'
                        >
                          <div className='min-w-0'>
                            <div className='text-foreground truncate font-medium'>
                              {f.title ?? f.filename}
                            </div>

                            <CaseFileDocumentBadge
                              documentType={f.documentType}
                              classificationStatus={f.classificationStatus}
                              classificationConfidence={
                                f.classificationConfidence
                              }
                            />

                            <div className='text-muted-foreground mt-0.5 text-xs leading-5'>
                              <span className='truncate'>{f.filename}</span>
                              {' · '}
                              {String(f.category ?? '—')}
                              {' · '}
                              {source}
                            </div>

                            <div className='text-muted-foreground mt-0.5 text-xs leading-5'>
                              {fmt(f.createdAt)}
                              {' · '}
                              {fmtSize(f.size)}
                              {' · '}
                              {f.mimeType ?? '—'}
                            </div>
                          </div>

                          <a
                            className='hover:bg-muted border-border/60 bg-background/90 decoration-muted-foreground/40 hover:decoration-foreground/70 shrink-0 rounded-full border px-3 py-1.5 text-xs underline underline-offset-4 transition-colors'
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
            </div>

            <div className='border-border/60 bg-muted/10 text-muted-foreground border-t px-6 py-4 text-xs'>
              Die Dokumente sind für die weitere Bearbeitung und Weitergabe an
              die Versicherung vorbereitet.
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
