import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';

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

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1) primär aus Claims
    let role = pickRoleFromClaims(sessionClaims);

    // 2) Fallback über currentUser (dev-sicher)
    if (!role) {
      const u = await currentUser();
      role = String((u?.publicMetadata as any)?.role ?? '') as Role;
    }

    const isPartner = role === 'GUTACHTER' || role === 'ANWALT';

    if (!isPartner) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden', debug: { userId, role } },
        { status: 403 }
      );
    }

    const rows = await prisma.caseAssignment.findMany({
      where: {
        assigneeClerkUserId: userId,
        role: role as any,
        activeKey: 'ACTIVE',
        status: {
          in: ['PENDING', 'ACCEPTED'] as any
        }
      },
      orderBy: { assignedAt: 'desc' },
      include: {
        case: {
          include: {
            lead: true,
            partner: true,
            events: {
              orderBy: { occurredAt: 'desc' },
              take: 1
            }
          }
        }
      },
      take: 50
    });

    return NextResponse.json({ ok: true, role, items: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
