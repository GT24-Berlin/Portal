import PageContainer from '@/components/layout/page-container';
import CaseStatusEditor from '@/components/cases/case-status-editor';
import CaseAssignmentAdmin from '@/components/cases/case-assignment-admin';

import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import CaseFilesUpload from '@/components/cases/case-files-upload';

export const runtime = 'nodejs';

type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

export default async function CaseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) redirect('/auth/sign-in');

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '') as Role;

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
        active: true
      },
      select: { id: true, status: true, active: true, expiresAt: true },
      orderBy: { assignedAt: 'desc' }
    });

    if (!assignment) notFound();

    // Lazy expire: wenn PENDING aber abgelaufen -> EXPIRED + active=false, dann 404
    const now = new Date();
    if (
      assignment.active &&
      assignment.status === 'PENDING' &&
      assignment.expiresAt <= now
    ) {
      await prisma.caseAssignment.update({
        where: { id: assignment.id },
        data: { status: 'EXPIRED' as any, active: false }
      });
      notFound();
    }

    // RELEASED/EXPIRED sollen niemals Zugriff haben
    if (!assignment.active) notFound();
    if (assignment.status === 'RELEASED' || assignment.status === 'EXPIRED')
      notFound();

    // Editing erst nach Accept
    canEdit = assignment.status === 'ACCEPTED';
  }

  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      events: { orderBy: { occurredAt: 'asc' } },
      lead: true,
      partner: true
    }
  });

  if (!c) notFound();

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

  const canUpload = canEdit;
  return (
    <PageContainer
      pageTitle='Case Detail'
      pageDescription={c.caseNumber ?? c.id}
    >
      <div className='space-y-6'>
        <div className='flex flex-col gap-3 rounded-lg border p-4 text-sm md:flex-row md:justify-between'>
          <div>
            <div className='text-muted-foreground text-xs'>Case</div>
            <div className='font-mono'>{c.caseNumber ?? c.id}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Token</div>
            <div className='font-mono break-all'>{c.token}</div>
          </div>
          <div>
            <div className='text-muted-foreground text-xs'>Rolle</div>
            <div className='font-mono'>{role || 'UNSET'}</div>
          </div>
        </div>

        {isAdmin ? <CaseAssignmentAdmin caseId={c.id} /> : null}

        {/* Preview immer möglich, aber Edit nur wenn ACCEPTED oder ADMIN */}
        <CaseStatusEditor
          caseId={c.id}
          gutachterStatus={String(c.gutachterStatus)}
          anwaltStatus={String(c.anwaltStatus)}
          role={canEdit ? role : ''} // <- Trick: nicht editierbar => Editor zeigt "Keine Berechtigung"
        />

        {/* Dokumente (Case Files) */}
        <div className='bg-card space-y-3 rounded-xl border p-6'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h3 className='text-lg font-semibold'>Dokumente</h3>
              <p className='text-muted-foreground text-xs'>
                Uploads vom Kunden & Partner (je nach Sichtbarkeit)
              </p>
            </div>

            {canUpload ? (
              <div className='shrink-0'>
                <CaseFilesUpload caseId={c.id} />
              </div>
            ) : (
              <span className='text-muted-foreground shrink-0 text-xs'>
                Upload erst nach Annahme (ACCEPTED).
              </span>
            )}
          </div>

          {files.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              Noch keine Dokumente.
            </p>
          ) : (
            <div className='space-y-2'>
              {files.map((f) => (
                <div
                  key={f.id}
                  className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'
                >
                  <div className='min-w-0'>
                    <div className='truncate font-medium'>
                      {f.title ? f.title : f.filename}
                    </div>

                    <div className='text-muted-foreground text-xs'>
                      {f.filename} · {String(f.uploaderType)} ·{' '}
                      {String(f.visibility)}
                    </div>

                    <div className='text-muted-foreground text-xs'>
                      {new Intl.DateTimeFormat('de-DE', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      }).format(new Date(f.createdAt))}
                      {' · '}
                      {f.size ? `${Math.round(f.size / 1024)} KB` : '—'}
                    </div>
                  </div>

                  <a
                    className='hover:bg-muted shrink-0 rounded-md border px-3 py-1 text-xs'
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

        <div className='rounded-lg border p-4'>
          <div className='mb-3 text-sm font-medium'>Events</div>
          <div className='space-y-2 text-sm'>
            {c.events.length === 0 ? (
              <div className='text-muted-foreground'>Noch keine Events.</div>
            ) : (
              c.events.map((e) => (
                <div key={e.id} className='rounded-md border p-3'>
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
        </div>
      </div>
    </PageContainer>
  );
}
