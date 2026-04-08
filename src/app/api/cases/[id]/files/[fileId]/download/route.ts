import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isAdmin, isPartner } from '@/lib/rbac';
import fs from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/uploads';
import { CaseFileVisibility } from '@prisma/client';

export const runtime = 'nodejs';

function parseLocalKey(storageKey: string) {
  // expected: "local:<filename>"
  if (!storageKey?.startsWith('local:')) return null;
  return storageKey.slice('local:'.length);
}

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
      select: { filename: true, mimeType: true, storageKey: true }
    });

    if (!f)
      return NextResponse.json(
        { ok: false, error: 'file not found' },
        { status: 404 }
      );

    const local = parseLocalKey(f.storageKey);
    if (!local) {
      return NextResponse.json(
        { ok: false, error: 'unsupported storageKey' },
        { status: 400 }
      );
    }

    const absPath = path.join(UPLOAD_DIR, local);
    const buf = await fs.readFile(absPath);

    const safeName = (f.filename ?? 'download').replace(/[\r\n"]/g, '');

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': f.mimeType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
