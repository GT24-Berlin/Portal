import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import CaseTopNav from '@/components/case/case-top-nav';
import { findCaseGutachtenFile } from '@/features/gutachten-insights/lib/find-case-gutachten-file';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';
import { getGutachtenInsightsState } from '@/features/gutachten-insights/lib/get-gutachten-insights-state';
import type { GutachtenInsights } from '@/features/gutachten-insights/types';
import { getCaseGutachtenInsights } from '@/features/gutachten-insights/lib/get-case-gutachten-insights';
import { buildGutachtenSummary } from '@/features/gutachten-insights/lib/build-gutachten-summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(dt?: Date | null) {
  if (!dt) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dt);
}

function fmtMoney(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toLocaleString('de-DE')} €`
    : 'Daten noch nicht vorhanden';
}

export default async function CaseGutachtenPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  try {
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
        },
        files: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            filename: true,
            mimeType: true,
            category: true,
            visibility: true,
            createdAt: true,
            documentType: true,
            classificationStatus: true,
            classificationConfidence: true
          }
        }
      }
    });

    if (!found) notFound();

    if (!found.customer) {
      redirect(`/case/${token}/register`);
    }

    if (!found.customer.otpVerifiedAt) {
      redirect(`/case/${token}/verify`);
    }

    await cookies();

    const gutachtenFile = findCaseGutachtenFile(found.files);
    const insights: GutachtenInsights = await getCaseGutachtenInsights({
      caseId: found.id,
      gutachtenFileId: gutachtenFile?.id ?? null
    });
    const summaryLines = buildGutachtenSummary(insights);

    const gutachtenInfoText =
      insights.status === 'PARSED'
        ? 'Das Gutachten wurde erfolgreich ausgewertet. Die wichtigsten Kennzahlen wurden übernommen.'
        : insights.status === 'AVAILABLE_UNPARSED'
          ? 'Das Gutachten liegt bereits vor. Die strukturierte Aufbereitung der Inhalte ist noch nicht abgeschlossen. Bis dahin werden die wichtigsten Kennzahlen aus dem Dokument noch nicht vollständig angezeigt. Du kannst das Originaldokument aber direkt öffnen.'
          : '';

    return (
      <div className='bg-background text-foreground h-[100dvh] overflow-y-auto'>
        <div className='mx-auto max-w-5xl space-y-6 px-4 py-10 pb-24'>
          <CaseTopNav
            token={token}
            active='gutachten'
            title='Ihr Gutachten'
            subtitle={`Fallnummer: ${found.caseNumber ?? '—'} · ${
              [found.customer.firstName, found.customer.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || 'Kunde'
            }`}
          />

          <section className='border-border/60 bg-card/95 overflow-hidden rounded-[28px] border shadow-sm'>
            <div className='border-border/60 bg-muted/15 grid gap-4 border-b p-6 md:grid-cols-[1.35fr_0.65fr] md:p-8'>
              <div className='space-y-2'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Gutachten
                </div>
                <h2 className='font-heading text-foreground text-2xl font-semibold tracking-tight md:text-3xl'>
                  Überblick zu Ihrem Gutachten
                </h2>
                <p className='text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]'>
                  Hier finden Sie die wichtigsten Inhalte und Kennzahlen aus
                  Ihrem Gutachten in verständlicher Form zusammengefasst.
                </p>
              </div>

              <div className='border-border/60 bg-background/80 grid gap-2 rounded-2xl border p-4 shadow-sm'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
                  Service
                </div>
                <div className='text-foreground text-sm font-medium'>
                  Fallnummer {found.caseNumber ?? '—'}
                </div>
                <div className='text-muted-foreground text-sm'>
                  {found.customer.firstName} {found.customer.lastName}
                </div>
              </div>
            </div>

            <div className='space-y-6 p-6 md:p-8'>
              {insights.status === 'PARSED' && summaryLines.length > 0 ? (
                <section className='border-border/60 bg-muted/10 rounded-2xl border p-5 shadow-sm md:p-6'>
                  <div className='space-y-2'>
                    <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                      Kurzübersicht
                    </p>
                    <h2 className='font-heading text-foreground text-xl font-semibold tracking-tight'>
                      Das Wichtigste aus dem Gutachten
                    </h2>
                  </div>

                  <div className='mt-4 space-y-3'>
                    {summaryLines.map((line, index) => (
                      <div
                        key={index}
                        className='bg-background/80 border-border/60 text-foreground rounded-2xl border px-4 py-3 text-sm shadow-sm md:text-base'
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Schadenshöhe
                  </div>
                  <div className='text-foreground mt-2 text-sm font-semibold'>
                    {fmtMoney(insights.schadenshoeheBrutto)}
                  </div>
                  <div className='text-muted-foreground mt-1 text-xs'>
                    Reparaturkosten brutto
                  </div>
                </div>

                <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Wiederbeschaffungswert
                  </div>
                  <div className='text-foreground mt-2 text-sm font-semibold'>
                    {fmtMoney(insights.wiederbeschaffungswert)}
                  </div>
                  <div className='text-muted-foreground mt-1 text-xs'>
                    Marktwert eines gleichwertigen Fahrzeugs
                  </div>
                </div>

                <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Wertminderung
                  </div>
                  <div className='text-foreground mt-2 text-sm font-semibold'>
                    {fmtMoney(insights.wertminderung)}
                  </div>
                  <div className='text-muted-foreground mt-1 text-xs'>
                    Zusätzlicher merkantiler Minderwert
                  </div>
                </div>

                <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Nutzungsausfall
                  </div>
                  <div className='text-foreground mt-2 text-sm font-semibold'>
                    {typeof insights.nutzungsausfallProTag === 'number' &&
                    Number.isFinite(insights.nutzungsausfallProTag)
                      ? `${insights.nutzungsausfallProTag.toLocaleString('de-DE')} € / Tag`
                      : 'Daten noch nicht vorhanden'}
                  </div>
                  <div className='text-muted-foreground mt-1 text-xs'>
                    Mögliche Entschädigung pro Kalendertag
                  </div>
                </div>
              </div>

              <div className='border-border/60 bg-muted/10 rounded-2xl border p-5 shadow-sm'>
                <div className='space-y-4'>
                  <div>
                    <div className='text-foreground text-sm font-medium'>
                      Weitere Kennzahlen aus dem Gutachten
                    </div>
                    <div className='text-muted-foreground mt-1 text-sm'>
                      Sobald die Auswertung vorliegt, zeigen wir dir hier die
                      wichtigsten Werte in verständlicher Form.
                    </div>
                  </div>

                  <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
                    <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Reparaturkosten netto
                      </div>
                      <div className='text-foreground mt-2 text-sm font-semibold'>
                        {fmtMoney(insights.reparaturkostenNetto)}
                      </div>
                    </div>

                    <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Reparaturkosten brutto
                      </div>
                      <div className='text-foreground mt-2 text-sm font-semibold'>
                        {fmtMoney(insights.reparaturkostenBrutto)}
                      </div>
                    </div>

                    <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Reparaturdauer
                      </div>
                      <div className='text-foreground mt-2 text-sm font-semibold'>
                        {typeof insights.reparaturdauerArbeitstage ===
                          'number' &&
                        Number.isFinite(insights.reparaturdauerArbeitstage)
                          ? `${insights.reparaturdauerArbeitstage} Arbeitstage`
                          : 'Daten noch nicht vorhanden'}
                      </div>
                    </div>

                    <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Abrechnungsart
                      </div>
                      <div className='text-foreground mt-2 text-sm font-semibold'>
                        {insights.abrechnungsart ??
                          'Daten noch nicht vorhanden'}
                      </div>
                    </div>

                    <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                        Mietwagenklasse
                      </div>
                      <div className='text-foreground mt-2 text-sm font-semibold'>
                        {insights.mietwagenklasse ??
                          'Daten noch nicht vorhanden'}
                      </div>
                    </div>
                  </div>

                  <div className='border-border/60 bg-background/80 rounded-2xl border p-4 shadow-sm'>
                    <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                      Reparaturstatus
                    </div>
                    <div className='text-foreground mt-2 text-sm font-semibold'>
                      {insights.reparaturwuerdig == null
                        ? 'Daten noch nicht vorhanden'
                        : insights.reparaturwuerdig
                          ? 'Reparatur wirtschaftlich sinnvoll'
                          : 'Reparatur wirtschaftlich nicht sinnvoll'}
                    </div>
                  </div>
                </div>
              </div>

              {gutachtenFile ? (
                <div className='border-border/60 bg-muted/10 rounded-2xl border p-5 shadow-sm'>
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <div className='text-foreground text-sm font-medium'>
                        Vorhandenes Gutachten
                      </div>
                      <div className='text-foreground text-sm'>
                        {gutachtenFile.title || gutachtenFile.filename}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        Hochgeladen am {fmt(gutachtenFile.createdAt)}
                      </div>
                      <div className='text-muted-foreground text-sm leading-6'>
                        {gutachtenInfoText}
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-3'>
                      <a
                        href={`/api/case/${token}/files/${gutachtenFile.id}/download`}
                        target='_blank'
                        rel='noreferrer'
                        className='border-border/60 bg-background/80 hover:bg-muted inline-flex rounded-full border px-4 py-2 text-sm shadow-sm'
                      >
                        Gutachten öffnen
                      </a>

                      <a
                        href={`/case/${token}/documents`}
                        className='border-border/60 bg-background/80 hover:bg-muted inline-flex rounded-full border px-4 py-2 text-sm shadow-sm'
                      >
                        Zu den Dokumenten
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='border-border/60 bg-muted/10 rounded-2xl border border-dashed p-6 shadow-sm'>
                  <div className='space-y-2'>
                    <div className='text-foreground text-sm font-medium'>
                      Daten noch nicht vorhanden
                    </div>
                    <div className='text-muted-foreground max-w-2xl text-sm leading-6'>
                      Sobald Ihr Gutachten vorliegt, zeigen wir Ihnen hier die
                      wichtigsten Werte und eine verständliche Zusammenfassung.
                      Bis dahin werden noch keine Schadenshöhe und kein
                      geschätzter Anspruch berechnet.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableState
          title='Gutachten ist gerade nicht verfügbar'
          description='Die Seite kann im Moment keine Daten aus der Datenbank laden.'
          retryHref={`/case/${(await params).token}/gutachten`}
          retryLabel='Erneut laden'
        />
      );
    }

    throw error;
  }
}
