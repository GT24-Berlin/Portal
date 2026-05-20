import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findCaseGutachtenFile } from '@/features/gutachten-insights/lib/find-case-gutachten-file';
import { extractGutachtenInsightsFromText } from '@/features/gutachten-insights/lib/extract-gutachten-insights';
import { upsertCaseGutachtenInsights } from '@/features/gutachten-insights/lib/upsert-case-gutachten-insights';
import { auth } from '@clerk/nextjs/server';

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
          classificationConfidence: true,
          classificationSource: true,
          classificationSignals: true,
          classifiedAt: true
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

  const sourceRow = found.files.find((f) => f.id === gutachtenFile.id);

  if (!sourceRow) {
    return NextResponse.json(
      { ok: false, error: 'Gutachten file row not found' },
      { status: 404 }
    );
  }

  if (sourceRow.documentType !== 'GUTACHTEN_MAIN') {
    return NextResponse.json({
      ok: false,
      degraded: true,
      error: 'Document is not classified as main gutachten',
      status: 'WRONG_DOCUMENT_TYPE',
      documentType: sourceRow.documentType,
      classificationStatus: sourceRow.classificationStatus,
      classificationConfidence: sourceRow.classificationConfidence
    });
  }

  if (sourceRow.classificationStatus !== 'CLASSIFIED') {
    return NextResponse.json({
      ok: false,
      degraded: true,
      error: 'Document classification is not ready',
      status: 'CLASSIFICATION_NOT_READY',
      documentType: sourceRow.documentType,
      classificationStatus: sourceRow.classificationStatus,
      classificationConfidence: sourceRow.classificationConfidence
    });
  }

  if (sourceRow.classificationConfidence === 'LOW') {
    return NextResponse.json({
      ok: false,
      degraded: true,
      error: 'Document classification confidence too low',
      status: 'CLASSIFICATION_LOW_CONFIDENCE',
      documentType: sourceRow.documentType,
      classificationStatus: sourceRow.classificationStatus,
      classificationConfidence: sourceRow.classificationConfidence
    });
  }

  const text = String(sourceRow?.parsedText ?? '').trim();

  if (!text.trim()) {
    await upsertCaseGutachtenInsights({
      caseId: found.id,
      sourceCaseFileId: gutachtenFile.id,
      insights: extractGutachtenInsightsFromText('')
    });

    return NextResponse.json({
      ok: true,
      status: 'AVAILABLE_UNPARSED',
      message: 'No parsable text content found in gutachten file'
    });
  }

  const insights = extractGutachtenInsightsFromText(text);

  await upsertCaseGutachtenInsights({
    caseId: found.id,
    sourceCaseFileId: gutachtenFile.id,
    insights,
    rawExtractionJson: { source: 'rule_based_v1' }
  });

  return NextResponse.json({
    ok: true,
    status: insights.status,
    insights
  });
}
