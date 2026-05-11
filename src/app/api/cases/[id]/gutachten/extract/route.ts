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

  const sourceRow = found.files.find((f) => f.id === gutachtenFile.id);
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
