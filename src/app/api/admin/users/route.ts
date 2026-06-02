import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/rbac';

export const runtime = 'nodejs';

/**
 * Robust gegen Clerk-Versionen:
 * - manche Projekte exportieren clerkClient als Objekt
 * - andere als Funktion clerkClient()
 */
async function getClerk() {
  // @ts-ignore
  return typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
        },
        { status: guard.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = (searchParams.get('role') || '').toUpperCase();

    const onlyRole: 'GUTACHTER' | 'ANWALT' | '' =
      roleFilter === 'GUTACHTER'
        ? 'GUTACHTER'
        : roleFilter === 'ANWALT'
          ? 'ANWALT'
          : '';

    const limit = Math.min(
      Math.max(Number(searchParams.get('limit') ?? 100), 1),
      200
    );

    const client = await getClerk();

    // Clerk: Liste holen (wir filtern anschließend nach publicMetadata.role)
    const list = await client.users.getUserList({ limit });

    const users = list.data
      .map((u: any) => {
        const r = String((u.publicMetadata as any)?.role ?? '').toUpperCase();
        return {
          id: u.id,
          role: r,
          name:
            [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
            u.username ||
            u.primaryEmailAddress?.emailAddress ||
            u.id,
          email: u.primaryEmailAddress?.emailAddress ?? null
        };
      })
      .filter((u: any) => (onlyRole ? u.role === onlyRole : true));

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
