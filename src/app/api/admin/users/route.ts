import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

/**
 * Robust gegen Clerk-Versionen:
 * - manche Projekte exportieren clerkClient als Objekt
 * - andere als Funktion clerkClient()
 */
async function getClerk() {
  // @ts-ignore
  return typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
}

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

  // Fallback: falls Claims keine Rolle enthalten → User laden
  if (!role) {
    const client = await getClerk();
    const u = await client.users.getUser(userId);
    role = String((u.publicMetadata as any)?.role ?? '') as Role;
  }

  if (role !== 'ADMIN') {
    return { ok: false as const, status: 403, userId, role };
  }

  return { ok: true as const, status: 200, userId, role };
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
