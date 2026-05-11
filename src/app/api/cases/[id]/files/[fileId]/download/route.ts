import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isAdmin, isPartner } from '@/lib/rbac';
import { CaseFileVisibility } from '@prisma/client';
import { createStoredFileDownloadResponse } from '@/lib/storage';
export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
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

    const { id: caseId, fileId } = await params;
    if (!caseId || !fileId) {
      return NextResponse.json(
        { ok: false, error: 'Missing params' },
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
            CaseFileVisibility.PARTNERS,
            CaseFileVisibility.CUSTOMER_AND_PARTNERS
          ]
        };

    const f = await prisma.caseFile.findFirst({
      where: {
        id: fileId,
        caseId,
        ...(visibilityFilter ? { visibility: visibilityFilter } : {})
      },
      select: {
        filename: true,
        mimeType: true,
        storageKey: true,
        size: true
      }
    });

    if (!f)
      return NextResponse.json(
        { ok: false, error: 'file not found' },
        { status: 404 }
      );

    return createStoredFileDownloadResponse({
      storageKey: f.storageKey,
      filename: f.filename,
      mimeType: f.mimeType,
      size: f.size
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
