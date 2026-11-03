import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCaseAccess, requireCaseAssignmentAccess } from '@/lib/policy';
import { CaseFileVisibility } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params;
    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: 'Missing case id' },
        { status: 400 }
      );
    }

    // Level 1: case-level access — ACTIVE membership + CaseOrganization
    const access = await requireCaseAccess(caseId);
    if (!access.ok) {
      const error =
        access.status === 401
          ? 'Unauthorized'
          : access.status === 404
            ? 'Not found'
            : 'Forbidden';
      return NextResponse.json({ ok: false, error }, { status: access.status });
    }

    // Determine caller tier from CaseOrganization org types
    const isInternalUser = access.caseOrgs.some(
      (co) => co.organization.type === 'INTERNAL'
    );

    if (!isInternalUser) {
      // Level 2: partner operational access — must have a live ACCEPTED assignment
      // (activeKey='ACTIVE' + status=ACCEPTED + active=true enforced inside helper)
      const assignmentAccess = await requireCaseAssignmentAccess(caseId);
      if (!assignmentAccess.ok) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    const visibilityFilter = isInternalUser
      ? undefined
      : {
          in: [
            CaseFileVisibility.CUSTOMER,
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
        size: true
        // storageKey intentionally omitted — never expose to clients
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
