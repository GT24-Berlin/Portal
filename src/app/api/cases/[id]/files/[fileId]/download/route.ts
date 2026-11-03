import { NextResponse } from 'next/server';
import {
  requireCaseFileAccess,
  requireCaseAssignmentAccess
} from '@/lib/policy';
import { CaseFileVisibility } from '@prisma/client';
import { createStoredFileDownloadResponse } from '@/lib/storage';

export const runtime = 'nodejs';

const PARTNER_DOWNLOADABLE: CaseFileVisibility[] = [
  CaseFileVisibility.PARTNERS,
  CaseFileVisibility.CUSTOMER_AND_PARTNERS
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: caseId, fileId } = await params;
    if (!caseId || !fileId) {
      return NextResponse.json(
        { ok: false, error: 'Missing params' },
        { status: 400 }
      );
    }

    // Level 1: file existence + case-level access (binds fileId to caseId,
    // prevents cross-case file enumeration)
    const access = await requireCaseFileAccess(fileId, caseId);
    if (!access.ok) {
      const error = access.status === 401 ? 'Unauthorized' : 'file not found';
      return NextResponse.json(
        { ok: false, error },
        { status: access.status === 401 ? 401 : 404 }
      );
    }

    // Determine caller tier from CaseOrganization org types
    const isInternalUser = access.caseOrgs.some(
      (co) => co.organization.type === 'INTERNAL'
    );

    if (!isInternalUser) {
      // Level 2: partner must have a live ACCEPTED assignment
      const assignmentAccess = await requireCaseAssignmentAccess(caseId);
      if (!assignmentAccess.ok) {
        return NextResponse.json(
          { ok: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Visibility gate: partners may only download PARTNERS / CUSTOMER_AND_PARTNERS
      if (!PARTNER_DOWNLOADABLE.includes(access.file.visibility)) {
        return NextResponse.json(
          { ok: false, error: 'file not found' },
          { status: 404 }
        );
      }
    }

    // storageKey is used internally only — never forwarded in response body or headers
    return createStoredFileDownloadResponse({
      storageKey: access.file.storageKey,
      filename: access.file.filename,
      mimeType: access.file.mimeType,
      size: access.file.size
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
