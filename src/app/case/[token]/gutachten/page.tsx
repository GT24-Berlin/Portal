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
            subtitle={`Case ID: ${found.caseNumber ?? found.id} · Token: ${found.token}`}
          />

          {insights.status === 'PARSED' && summaryLines.length > 0 ? (
            <section className='bg-card rounded-2xl border p-5 md:p-6'>
              <div className='space-y-2'>
                <p className='text-muted-foreground text-sm'>Kurzübersicht</p>
                <h2 className='text-xl font-semibold'>
                  Das Wichtigste aus dem Gutachten
                </h2>
              </div>

              <div className='mt-4 space-y-3'>
                {summaryLines.map((line, index) => (
                  <div
                    key={index}
                    className='bg-muted/40 rounded-xl border px-4 py-3 text-sm md:text-base'
                  >
                    {line}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className='rounded-[30px] border border-black/5 bg-white p-6 shadow-sm md:p-8'>
            <div className='space-y-6'>
              <div className='space-y-2'>
                <div className='text-[11px] font-semibold tracking-[0.18em] text-neutral-500 uppercase'>
                  Gutachten
                </div>
                <h2 className='text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl'>
                  Überblick zu Ihrem Gutachten
                </h2>
                <p className='max-w-2xl text-sm leading-6 text-neutral-600 md:text-[15px]'>
                  Hier finden Sie die wichtigsten Inhalte und Kennzahlen aus
                  Ihrem Gutachten in verständlicher Form zusammengefasst.
                </p>
              </div>

              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                <div className='rounded-2xl bg-neutral-50 p-4'>
                  <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                    Schadenshöhe
                  </div>
                  <div className='mt-2 text-sm font-semibold text-neutral-950'>
                    {fmtMoney(insights.schadenshoeheBrutto)}
                  </div>
                  <div className='mt-1 text-xs text-neutral-500'>
                    Reparaturkosten brutto
                  </div>
                </div>

                <div className='rounded-2xl bg-neutral-50 p-4'>
                  <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                    Wiederbeschaffungswert
                  </div>
                  <div className='mt-2 text-sm font-semibold text-neutral-950'>
                    {fmtMoney(insights.wiederbeschaffungswert)}
                  </div>
                  <div className='mt-1 text-xs text-neutral-500'>
                    Marktwert eines gleichwertigen Fahrzeugs
                  </div>
                </div>

                <div className='rounded-2xl bg-neutral-50 p-4'>
                  <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                    Wertminderung
                  </div>
                  <div className='mt-2 text-sm font-semibold text-neutral-950'>
                    {fmtMoney(insights.wertminderung)}
                  </div>
                  <div className='mt-1 text-xs text-neutral-500'>
                    Zusätzlicher merkantiler Minderwert
                  </div>
                </div>

                <div className='rounded-2xl bg-neutral-50 p-4'>
                  <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                    Nutzungsausfall
                  </div>
                  <div className='mt-2 text-sm font-semibold text-neutral-950'>
                    {typeof insights.nutzungsausfallProTag === 'number' &&
                    Number.isFinite(insights.nutzungsausfallProTag)
                      ? `${insights.nutzungsausfallProTag.toLocaleString('de-DE')} € / Tag`
                      : 'Daten noch nicht vorhanden'}
                  </div>
                  <div className='mt-1 text-xs text-neutral-500'>
                    Mögliche Entschädigung pro Kalendertag
                  </div>
                </div>
              </div>

              <div className='rounded-2xl border border-neutral-200 bg-neutral-50 p-5'>
                <div className='space-y-4'>
                  <div>
                    <div className='text-sm font-medium text-neutral-950'>
                      Weitere Kennzahlen aus dem Gutachten
                    </div>
                    <div className='mt-1 text-sm text-neutral-600'>
                      Sobald die Auswertung vorliegt, zeigen wir dir hier die
                      wichtigsten Werte in verständlicher Form.
                    </div>
                  </div>

                  <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
                    <div className='rounded-2xl bg-white p-4'>
                      <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                        Reparaturkosten netto
                      </div>
                      <div className='mt-2 text-sm font-semibold text-neutral-950'>
                        {fmtMoney(insights.reparaturkostenNetto)}
                      </div>
                    </div>

                    <div className='rounded-2xl bg-white p-4'>
                      <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                        Reparaturkosten brutto
                      </div>
                      <div className='mt-2 text-sm font-semibold text-neutral-950'>
                        {fmtMoney(insights.reparaturkostenBrutto)}
                      </div>
                    </div>

                    <div className='rounded-2xl bg-white p-4'>
                      <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                        Reparaturdauer
                      </div>
                      <div className='mt-2 text-sm font-semibold text-neutral-950'>
                        {typeof insights.reparaturdauerArbeitstage ===
                          'number' &&
                        Number.isFinite(insights.reparaturdauerArbeitstage)
                          ? `${insights.reparaturdauerArbeitstage} Arbeitstage`
                          : 'Daten noch nicht vorhanden'}
                      </div>
                    </div>

                    <div className='rounded-2xl bg-white p-4'>
                      <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                        Abrechnungsart
                      </div>
                      <div className='mt-2 text-sm font-semibold text-neutral-950'>
                        {insights.abrechnungsart ??
                          'Daten noch nicht vorhanden'}
                      </div>
                    </div>

                    <div className='rounded-2xl bg-white p-4'>
                      <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                        Mietwagenklasse
                      </div>
                      <div className='mt-2 text-sm font-semibold text-neutral-950'>
                        {insights.mietwagenklasse ??
                          'Daten noch nicht vorhanden'}
                      </div>
                    </div>
                  </div>

                  <div className='rounded-2xl bg-white p-4'>
                    <div className='text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase'>
                      Reparaturstatus
                    </div>
                    <div className='mt-2 text-sm font-semibold text-neutral-950'>
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
                <div className='rounded-2xl border border-neutral-200 bg-neutral-50 p-5'>
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <div className='text-sm font-medium text-neutral-950'>
                        Vorhandenes Gutachten
                      </div>
                      <div className='text-sm text-neutral-700'>
                        {gutachtenFile.title || gutachtenFile.filename}
                      </div>
                      <div className='text-xs text-neutral-500'>
                        Hochgeladen am {fmt(gutachtenFile.createdAt)}
                      </div>
                      <div className='text-sm leading-6 text-neutral-600'>
                        {gutachtenInfoText}
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-3'>
                      <a
                        href={`/api/case/${token}/files/${gutachtenFile.id}/download`}
                        target='_blank'
                        rel='noreferrer'
                        className='inline-flex rounded-lg border px-4 py-2 text-sm hover:bg-neutral-100'
                      >
                        Gutachten öffnen
                      </a>

                      <a
                        href={`/case/${token}/documents`}
                        className='inline-flex rounded-lg border px-4 py-2 text-sm hover:bg-neutral-100'
                      >
                        Zu den Dokumenten
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6'>
                  <div className='space-y-2'>
                    <div className='text-sm font-medium text-neutral-950'>
                      Daten noch nicht vorhanden
                    </div>
                    <div className='max-w-2xl text-sm leading-6 text-neutral-600'>
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
