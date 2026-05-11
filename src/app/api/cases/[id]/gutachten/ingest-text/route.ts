import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { readStoredFileToBuffer } from '@/lib/storage';
import { findCaseGutachtenFile } from '@/features/gutachten-insights/lib/find-case-gutachten-file';
import { extractPdfTextFromBuffer } from '@/features/gutachten-insights/lib/extract-pdf-text';

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
          parsedText: true
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

  const fileRow = found.files.find((f) => f.id === gutachtenFile.id);

  if (!fileRow) {
    return NextResponse.json(
      { ok: false, error: 'Gutachten file row not found' },
      { status: 404 }
    );
  }

  const mime = String(fileRow.mimeType ?? '').toLowerCase();
  if (!mime.includes('pdf')) {
    return NextResponse.json(
      { ok: false, error: 'Gutachten file is not a PDF' },
      { status: 400 }
    );
  }

  const buffer = await readStoredFileToBuffer(fileRow.storageKey);

  let parsedText = '';
  try {
    parsedText = await extractPdfTextFromBuffer(buffer);
  } catch (error) {
    console.warn('[gutachten] ingest-text degraded', {
      caseId,
      fileId: fileRow.id,
      message: error instanceof Error ? error.message : String(error)
    });
    parsedText = '';
  }

  if (parsedText) {
    await prisma.caseFile.update({
      where: { id: fileRow.id },
      data: {
        parsedText
      }
    });
  }

  return NextResponse.json({
    ok: true,
    degraded: parsedText.length === 0,
    fileId: fileRow.id,
    parsedTextLength: parsedText.length
  });
}
