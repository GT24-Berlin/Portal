import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/rbac';

export const runtime = 'nodejs';

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
        activeKey: true,
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
      GUTACHTER:
        rows.find((r) => r.role === 'GUTACHTER' && r.activeKey === 'ACTIVE') ??
        null,
      ANWALT:
        rows.find((r) => r.role === 'ANWALT' && r.activeKey === 'ACTIVE') ??
        null
    };

    return NextResponse.json({ ok: true, current, assignments: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
