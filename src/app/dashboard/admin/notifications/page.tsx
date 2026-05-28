import PageContainer from '@/components/layout/page-container';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: 'Benachrichtigungen'
};

type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

type Item = {
  id: string;
  createdAt: string;
  readAt: string | null;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  caseId: string | null;
  role: string | null;
};

function fmt(dt: string) {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dt));
}

export default async function AdminNotificationsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/auth/sign-in');

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '') as Role;
  if (role !== 'ADMIN') redirect('/dashboard');

  // server-side fetch auf Admin-API (gleiche Origin)

  const h = await headers();

  const res = await fetch(
    'http://localhost:3000/api/admin/notifications?take=100',
    {
      cache: 'no-store',
      headers: {
        cookie: h.get('cookie') ?? ''
      }
    }
  ).catch(() => null);

  const data = (await res?.json().catch(() => null)) as {
    ok: boolean;
    items: Item[];
  } | null;

  const items = data?.ok ? data.items : [];

  return (
    <PageContainer
      pageTitle='Admin Notifications'
      pageDescription='System-Events & Partner-Aktionen (Assign / Accept / Release)'
    >
      <div className='rounded-lg border'>
        <div className='grid grid-cols-6 gap-2 border-b p-3 text-sm font-medium'>
          <div>Zeit</div>
          <div>Type</div>
          <div>Role</div>
          <div>Title</div>
          <div>UserId</div>
          <div>Case</div>
        </div>

        {items.length === 0 ? (
          <div className='text-muted-foreground p-6 text-sm'>
            Keine Notifications.
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className='grid grid-cols-6 gap-2 border-b p-3 text-sm last:border-b-0'
            >
              <div className='text-muted-foreground'>{fmt(n.createdAt)}</div>
              <div className='font-mono text-xs'>{n.type}</div>
              <div className='font-mono text-xs'>{n.role ?? '—'}</div>
              <div className='truncate'>
                <div className='font-medium'>{n.title}</div>
                {n.body ? (
                  <div className='text-muted-foreground truncate text-xs'>
                    {n.body}
                  </div>
                ) : null}
              </div>
              <div className='truncate font-mono text-xs'>{n.userId}</div>
              <div className='truncate font-mono text-xs'>
                {n.caseId ?? '—'}
              </div>
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}
