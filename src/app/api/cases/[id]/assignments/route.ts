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
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    role = String((u.publicMetadata as any)?.role ?? '') as Role;
  }

  if (role !== 'ADMIN') {
    return { ok: false as const, status: 403, userId, role };
  }

  return { ok: true as const, status: 200, userId, role };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: caseId } = await params;
    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: 'Missing case id' },
        { status: 400 }
      );
    }

    // Case existiert?
    const exists = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true }
    });
    if (!exists) {
      return NextResponse.json(
        { ok: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    // Für Admin: alle Assignments, neueste zuerst
    const rows = await prisma.caseAssignment.findMany({
      where: { caseId },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        caseId: true,
        role: true,
        status: true,
        active: true,
        assignedAt: true,
        expiresAt: true,
        acceptedAt: true,
        releasedAt: true,
        assigneeClerkUserId: true,
        assignedByClerkUserId: true
      }
    });

    // Optional: Convenience-Summary je Rolle (aktuelles active Assignment)
    const current = {
      GUTACHTER: rows.find((r) => r.role === 'GUTACHTER' && r.active) ?? null,
      ANWALT: rows.find((r) => r.role === 'ANWALT' && r.active) ?? null
    };

    return NextResponse.json({ ok: true, current, assignments: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
