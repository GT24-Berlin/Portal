import PageContainer from '@/components/layout/page-container';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: 'Benachrichtigungen'
};

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
  const guard = await requireAdmin();
  if (!guard.ok) {
    redirect(guard.status === 401 ? '/auth/sign-in' : '/dashboard');
  }

  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const origin = host
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

  const res = await fetch(
    new URL('/api/admin/notifications?take=100', origin),
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
