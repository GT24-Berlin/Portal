import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

function pickRoleFromClaims(claims: any): Role {
  const r =
    claims?.publicMetadata?.role ??
    claims?.metadata?.role ??
    claims?.user?.publicMetadata?.role ??
    '';
  return String(r || '') as Role;
}

async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId)
    return { ok: false as const, status: 401, userId: null, role: '' as Role };

  let role = pickRoleFromClaims(sessionClaims);
  if (!role) {
    const anyClient: any = clerkClient as any;
    const client =
      typeof anyClient === 'function' ? await anyClient() : anyClient;
    const u = await client.users.getUser(userId);
    role = String((u.publicMetadata as any)?.role ?? '') as Role;
  }

  if (role !== 'ADMIN')
    return { ok: false as const, status: 403, userId, role };
  return { ok: true as const, status: 200, userId, role };
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: guard.status }
    );
  }

  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get('take') ?? 50), 200);
  const onlyUnread = url.searchParams.get('unread') === '1';

  const rows = await prisma.notification.findMany({
    where: onlyUnread ? { readAt: null } : undefined,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      createdAt: true,
      readAt: true,
      userId: true,
      type: true,
      title: true,
      body: true,
      href: true,
      caseId: true,
      role: true
    }
  });

  return NextResponse.json({ ok: true, items: rows });
}
