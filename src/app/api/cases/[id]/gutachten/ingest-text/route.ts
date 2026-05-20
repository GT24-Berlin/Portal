import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { findCaseGutachtenFile } from '@/features/gutachten-insights/lib/find-case-gutachten-file';
import { processCaseFile } from '@/features/gutachten-insights/lib/process-case-file';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id: caseId } = await params;

  const found = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      files: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          filename: true,
          mimeType: true,
          category: true,
          visibility: true,
          createdAt: true,
          storageKey: true,
          parsedText: true,
          documentType: true,
          classificationStatus: true,
          classificationConfidence: true
        }
      }
    }
  });

  if (!found) {
    return NextResponse.json(
      { ok: false, error: 'Case not found' },
      { status: 404 }
    );
  }

  const gutachtenFile = findCaseGutachtenFile(found.files);

  if (!gutachtenFile) {
    return NextResponse.json(
      { ok: false, error: 'No gutachten file found' },
      { status: 404 }
    );
  }

  const result = await processCaseFile({
    caseId: found.id,
    fileId: gutachtenFile.id
  });

  return NextResponse.json(result, {
    status: 200
  });
}
