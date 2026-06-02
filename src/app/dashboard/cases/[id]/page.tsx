import {
  expireAssignmentIfNeeded,
  isAssignmentUsable
} from '@/lib/assignments';
import PageContainer from '@/components/layout/page-container';
import CaseStatusEditor from '@/components/cases/case-status-editor';
import CaseAssignmentAdmin from '@/components/cases/case-assignment-admin';

import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import CaseFilesUpload from '@/components/cases/case-files-upload';
import DatabaseUnavailableState from '@/components/system/database-unavailable';
import { isDatabaseUnavailableError } from '@/lib/database-error';
import CaseOperationsLogAccordion from '@/features/case-detail/components/case-operations-log-accordion';
import CaseCustomerInfoCard from '@/features/case-detail/components/case-customer-info-card';
import CaseAccidentDataCard from '@/features/case-detail/components/case-accident-data-card';
import CasePhotoGallery from '@/features/case-detail/components/case-photo-gallery';
import { getCasePhotoFiles } from '@/features/case-detail/lib/get-case-photo-files';
import { requireRole, type Role } from '@/lib/rbac';

export const runtime = 'nodejs';

export default async function CaseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;

    const { userId } = await auth();
    if (!userId) redirect('/auth/sign-in');

    const guard = await requireRole();
    if (!guard.ok) redirect('/auth/sign-in');

    const role = guard.role;

    const isAdmin = role === 'ADMIN';
    const isGutachter = role === 'GUTACHTER';
    const isAnwalt = role === 'ANWALT';

    // ---- RBAC: Zugriff auf Case Detail nur für ADMIN oder assigned user ----
    const requiredRole = isGutachter ? 'GUTACHTER' : isAnwalt ? 'ANWALT' : null;

    // wird genutzt, um Editing zu erlauben (ACCEPTED) vs. nur Preview
    let canEdit = isAdmin;

    if (!isAdmin) {
      if (!requiredRole) notFound();

      const assignment = await prisma.caseAssignment.findFirst({
        where: {
          caseId: id,
          role: requiredRole as any,
          assigneeClerkUserId: userId,
          activeKey: 'ACTIVE'
        },
        select: {
          id: true,
          status: true,
          active: true,
          activeKey: true,
          expiresAt: true
        },
        orderBy: { assignedAt: 'desc' }
      });

      if (!assignment) notFound();

      const now = new Date();
      const expiredResult = await expireAssignmentIfNeeded(assignment, now);

      if (expiredResult.expired) notFound();

      if (!isAssignmentUsable(assignment)) notFound();

      // Editing erst nach Accept
      canEdit = assignment.status === 'ACCEPTED';
    }

    const c = await prisma.case.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        intake: {
          include: {
            ownInsurance: {
              select: {
                name: true,
                email: true,
                phone: true,
                policyNumber: true,
                claimNumber: true,
                contactPerson: true
              }
            },
            opponentInsurance: {
              select: {
                name: true,
                email: true,
                phone: true,
                policyNumber: true,
                claimNumber: true,
                contactPerson: true
              }
            }
          }
        },
        events: { orderBy: { occurredAt: 'asc' } },
        lead: {
          select: {
            street: true,
            houseNumber: true,
            zipCode: true,
            city: true
          }
        },
        partner: true,
        operationalEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!c) notFound();

    const customerName = [c.customer?.firstName, c.customer?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const files = await prisma.caseFile.findMany({
      where: { caseId: c.id }, // oder einfach { caseId: id }
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        title: true,
        filename: true,
        mimeType: true,
        size: true,
        uploaderType: true,
        visibility: true
      }
    });

    const customerInfo = c.customer
      ? {
          firstName: c.customer.firstName,
          lastName: c.customer.lastName,
          email: c.customer.email,
          phone: c.customer.phone,
          street: c.lead?.street ?? null,
          houseNumber: c.lead?.houseNumber ?? null,
          zipCode: c.lead?.zipCode ?? null,
          city: c.lead?.city ?? null,
          country: null
        }
      : null;

    const accidentData = c.intake
      ? {
          claimRoute: c.intake.claimRoute,
          accidentDescription: c.intake.accidentDescription,
          accidentDate: c.intake.accidentDate,
          accidentLocation: c.intake.accidentLocation,

          driverIsHolder: c.intake.driverIsHolder,
          driverName: c.intake.driverName,
          driverPhone: c.intake.driverPhone,

          ownPlateNumber: c.intake.ownPlateNumber,
          ownCarMake: c.intake.ownCarMake,
          ownCarModel: c.intake.ownCarModel,
          ownCarYear: c.intake.ownCarYear,
          ownerName: c.intake.ownerName,

          opponentPlateNumber: c.intake.opponentPlateNumber,
          opponentCarMake: c.intake.opponentCarMake,
          opponentCarModel: c.intake.opponentCarModel,

          policeInvolved: c.intake.policeInvolved,
          policeReportNumber: c.intake.policeReportNumber,
          witnessesPresent: c.intake.witnessesPresent,
          witnessContact: c.intake.witnessContact,

          ownInsurance: c.intake.ownInsurance
            ? {
                name: c.intake.ownInsurance.name,
                email: c.intake.ownInsurance.email,
                phone: c.intake.ownInsurance.phone,
                policyNumber: c.intake.ownInsurance.policyNumber,
                claimNumber: c.intake.ownInsurance.claimNumber,
                contactPerson: c.intake.ownInsurance.contactPerson
              }
            : null,

          opponentInsurance: c.intake.opponentInsurance
            ? {
                name: c.intake.opponentInsurance.name,
                email: c.intake.opponentInsurance.email,
                phone: c.intake.opponentInsurance.phone,
                policyNumber: c.intake.opponentInsurance.policyNumber,
                claimNumber: c.intake.opponentInsurance.claimNumber,
                contactPerson: c.intake.opponentInsurance.contactPerson
              }
            : null
        }
      : null;

    const photoFiles = getCasePhotoFiles(files);

    const canUpload = canEdit;
    return (
      <PageContainer
        pageTitle='Case Detail'
        pageDescription={
          customerName
            ? `Kunde: ${customerName} · Fallnummer: ${c.caseNumber ?? '—'}`
            : `Fallnummer: ${c.caseNumber ?? '—'}`
        }
      >
        <div className='space-y-6'>
          <section className='border-border/60 bg-background/82 overflow-hidden rounded-[32px] border shadow-[var(--shadow-glass)] backdrop-blur-xl'>
            <div className='border-border/60 bg-muted/10 grid gap-4 border-b p-6 md:grid-cols-[1.4fr_0.6fr] md:p-8'>
              <div className='space-y-3'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Case Detail
                </div>
                <h1 className='font-heading text-foreground text-[2rem] font-semibold tracking-tight md:text-[2.6rem]'>
                  {c.caseNumber ?? '—'}
                </h1>
                <p className='text-muted-foreground max-w-3xl text-[14px] leading-6 md:text-[15px]'>
                  {customerName
                    ? `Kunde: ${customerName}`
                    : 'Kundeninformationen werden ergänzt, sobald sie verfügbar sind.'}
                </p>
              </div>

              <div className='border-border/60 bg-background/84 grid gap-2 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase'>
                  Summary
                </div>
                <div className='grid gap-2 text-sm'>
                  <div className='border-border/60 bg-background/90 rounded-[24px] border px-3 py-2 shadow-[var(--shadow-soft)]'>
                    <div className='text-muted-foreground text-xs'>
                      Fallnummer
                    </div>
                    <div className='text-foreground font-mono text-sm font-medium'>
                      {c.caseNumber ?? '—'}
                    </div>
                  </div>
                  <div className='border-border/60 bg-background/90 rounded-[24px] border px-3 py-2 shadow-[var(--shadow-soft)]'>
                    <div className='text-muted-foreground text-xs'>Kunde</div>
                    <div className='text-foreground font-medium'>
                      {customerName || '—'}
                    </div>
                  </div>
                  <div className='border-border/60 bg-background/90 rounded-[24px] border px-3 py-2 shadow-[var(--shadow-soft)]'>
                    <div className='text-muted-foreground text-xs'>Partner</div>
                    <div className='text-foreground font-medium'>
                      {c.partner?.name ?? '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className='grid gap-6'>
            {isAdmin ? <CaseAssignmentAdmin caseId={c.id} /> : null}

            <CaseStatusEditor
              caseId={c.id}
              gutachterStatus={String(c.gutachterStatus)}
              anwaltStatus={String(c.anwaltStatus)}
              role={canEdit ? role : ''} // <- Trick: nicht editierbar => Editor zeigt "Keine Berechtigung"
            />
          </div>

          <section className='border-border/60 bg-background/82 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]'>
            <div className='border-border/60 flex flex-wrap items-start justify-between gap-3 border-b px-6 py-5'>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Hauptfläche
                </p>
                <h3 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
                  Dokumente
                </h3>
                <p className='text-muted-foreground text-xs leading-6'>
                  Uploads vom Kunden & Partner (je nach Sichtbarkeit)
                </p>
              </div>

              {canUpload ? (
                <div className='shrink-0'>
                  <CaseFilesUpload caseId={c.id} />
                </div>
              ) : (
                <span className='text-muted-foreground shrink-0 text-xs leading-6'>
                  Upload erst nach Annahme (ACCEPTED).
                </span>
              )}
            </div>

            <div className='px-6 pt-0 pb-6'>
              {files.length === 0 ? (
                <p className='text-muted-foreground border-border/60 bg-background/78 rounded-[24px] border border-dashed px-4 py-6 text-sm shadow-[var(--shadow-soft)]'>
                  Noch keine Dokumente.
                </p>
              ) : (
                <div className='space-y-2'>
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className='border-border/60 bg-background/84 hover:bg-primary/[0.02] flex items-center justify-between rounded-[26px] border px-4 py-3.5 text-sm shadow-[var(--shadow-soft)] transition-colors'
                    >
                      <div className='min-w-0'>
                        <div className='text-foreground truncate font-medium'>
                          {f.title ? f.title : f.filename}
                        </div>

                        <div className='text-muted-foreground text-xs leading-5'>
                          {f.filename} · {String(f.uploaderType)} ·{' '}
                          {String(f.visibility)}
                        </div>

                        <div className='text-muted-foreground text-xs leading-5'>
                          {new Intl.DateTimeFormat('de-DE', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          }).format(new Date(f.createdAt))}
                          {' · '}
                          {f.size ? `${Math.round(f.size / 1024)} KB` : '—'}
                        </div>
                      </div>

                      <a
                        className='border-border/60 bg-background/90 decoration-muted-foreground/40 hover:bg-muted/50 hover:decoration-foreground/70 shrink-0 rounded-full border px-3 py-1.5 text-xs underline underline-offset-4 shadow-[var(--shadow-soft)] transition-colors'
                        href={`/api/cases/${c.id}/files/${f.id}/download`}
                        target='_blank'
                        rel='noreferrer'
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className='grid gap-6'>
            <CaseCustomerInfoCard customer={customerInfo} />
            <CaseAccidentDataCard intake={accidentData} />
            <CasePhotoGallery caseId={c.id} items={photoFiles} />
            <CaseOperationsLogAccordion items={c.operationalEvents} />
          </section>

          <section className='border-border/60 bg-background/82 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]'>
            <div className='border-border/60 flex flex-wrap items-start justify-between gap-3 border-b px-6 py-5'>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Supporting Context
                </div>
                <div className='font-heading text-lg font-semibold tracking-tight'>
                  Events
                </div>
              </div>
            </div>
            <div className='space-y-2 p-6 text-sm'>
              {c.events.length === 0 ? (
                <div className='text-muted-foreground border-border/60 bg-background/78 rounded-[24px] border border-dashed px-4 py-6 shadow-[var(--shadow-soft)]'>
                  Noch keine Events.
                </div>
              ) : (
                c.events.map((e) => (
                  <div
                    key={e.id}
                    className='border-border/60 bg-background/84 hover:bg-primary/[0.02] rounded-[26px] border p-4 shadow-[var(--shadow-soft)] transition-colors'
                  >
                    <div className='flex flex-wrap gap-x-3 gap-y-1'>
                      <span className='font-mono text-xs opacity-80'>
                        {String((e as any).lane)}
                      </span>
                      <span className='font-mono text-xs opacity-80'>
                        {e.status}
                      </span>
                      <span className='text-muted-foreground text-xs'>
                        {new Date(e.occurredAt).toLocaleString('de-DE')}
                      </span>
                    </div>
                    {e.note ? (
                      <div className='text-muted-foreground mt-2'>{e.note}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </PageContainer>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableState
          title='Case-Detail temporär nicht verfügbar'
          description='Die Fall-Detailseite konnte gerade nicht geladen werden, weil die Datenbankverbindung aktuell nicht erreichbar ist.'
          retryHref='/dashboard/cases'
          retryLabel='Zur Cases-Übersicht'
        />
      );
    }

    throw error;
  }
}
