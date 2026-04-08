import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isAdmin, isPartner } from '@/lib/rbac';
import { CaseFileVisibility } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole();
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

    const role = guard.role;
    const userId = guard.userId!;

    // Partner dürfen nur, wenn ACCEPTED + active Assignment existiert
    if (isPartner(role) && !isAdmin(role)) {
      const a = await prisma.caseAssignment.findFirst({
        where: {
          caseId,
          assigneeClerkUserId: userId,
          role: role as any,
          active: true,
          status: 'ACCEPTED' as any
        },
        select: { id: true }
      });

      if (!a) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    const visibilityFilter = isAdmin(role)
      ? undefined
      : {
          in: [
            CaseFileVisibility.CUSTOMER, // ✅ Kunden-Uploads immer sichtbar für Partner
            CaseFileVisibility.CUSTOMER_AND_PARTNERS,
            CaseFileVisibility.PARTNERS
          ]
        };

    const files = await prisma.caseFile.findMany({
      where: {
        caseId,
        ...(visibilityFilter ? { visibility: visibilityFilter } : {})
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        uploaderType: true,
        uploaderId: true,
        role: true,
        visibility: true,
        category: true,
        title: true,
        filename: true,
        mimeType: true,
        size: true,
        storageKey: true
      },
      take: 200
    });

    return NextResponse.json({ ok: true, files });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
