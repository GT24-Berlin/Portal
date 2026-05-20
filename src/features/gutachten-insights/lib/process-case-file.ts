import { prisma } from '@/lib/prisma';
import { readStoredFileToBuffer } from '@/lib/storage';
import { extractPdfTextFromBuffer } from './extract-pdf-text';
import { classifyCaseFile } from '@/features/case-file-classification/lib/classify-case-file';
import { extractGutachtenInsightsFromText } from './extract-gutachten-insights';
import { upsertCaseGutachtenInsights } from './upsert-case-gutachten-insights';
import type {
  CaseFileClassificationStatus,
  CaseFileDocumentType
} from '@prisma/client';

export type ProcessCaseFileResult = {
  ok: boolean;
  degraded: boolean;
  fileId: string;
  parsedTextLength: number;
  documentType: string | null;
  classificationStatus: string | null;
  classificationConfidence: string | null;
  extractedGutachten: boolean;
  error?: string;
};

export async function processCaseFile(input: {
  caseId: string;
  fileId: string;
}): Promise<ProcessCaseFileResult> {
  const fileRow = await prisma.caseFile.findUnique({
    where: { id: input.fileId },
    select: {
      id: true,
      caseId: true,
      title: true,
      filename: true,
      mimeType: true,
      storageKey: true,
      parsedText: true
    }
  });

  if (!fileRow || fileRow.caseId !== input.caseId) {
    return {
      ok: false,
      degraded: true,
      fileId: input.fileId,
      parsedTextLength: 0,
      documentType: null,
      classificationStatus: null,
      classificationConfidence: null,
      extractedGutachten: false,
      error: 'Case file not found'
    };
  }

  const mime = String(fileRow.mimeType ?? '').toLowerCase();
  if (!mime.includes('pdf')) {
    await prisma.caseFile.update({
      where: { id: fileRow.id },
      data: {
        classificationStatus: 'FAILED' as CaseFileClassificationStatus,
        classificationSource: 'RULE_BASED_V1',
        classificationSignals: ['NOT_PDF'],
        classifiedAt: new Date()
      }
    });

    return {
      ok: false,
      degraded: true,
      fileId: fileRow.id,
      parsedTextLength: 0,
      documentType: null,
      classificationStatus: 'FAILED',
      classificationConfidence: null,
      extractedGutachten: false,
      error: 'File is not a PDF'
    };
  }

  let parsedText = '';
  try {
    const buffer = await readStoredFileToBuffer(fileRow.storageKey);
    parsedText = await extractPdfTextFromBuffer(buffer);
  } catch (error) {
    await prisma.caseFile.update({
      where: { id: fileRow.id },
      data: {
        parsedText: null,
        classificationStatus: 'FAILED' as CaseFileClassificationStatus,
        classificationSource: 'RULE_BASED_V1',
        classificationSignals: ['PARSE_ERROR'],
        classifiedAt: new Date()
      }
    });

    return {
      ok: false,
      degraded: true,
      fileId: fileRow.id,
      parsedTextLength: 0,
      documentType: null,
      classificationStatus: 'FAILED',
      classificationConfidence: null,
      extractedGutachten: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  if (!parsedText.trim()) {
    await prisma.caseFile.update({
      where: { id: fileRow.id },
      data: {
        parsedText: null,
        classificationStatus: 'FAILED' as CaseFileClassificationStatus,
        classificationSource: 'RULE_BASED_V1',
        classificationSignals: ['EMPTY_PARSED_TEXT'],
        classifiedAt: new Date()
      }
    });

    return {
      ok: false,
      degraded: true,
      fileId: fileRow.id,
      parsedTextLength: 0,
      documentType: null,
      classificationStatus: 'FAILED',
      classificationConfidence: null,
      extractedGutachten: false,
      error: 'PDF text extraction returned no text'
    };
  }

  const classification = classifyCaseFile({
    filename: fileRow.filename,
    title: fileRow.title,
    mimeType: fileRow.mimeType,
    parsedText
  });

  await prisma.caseFile.update({
    where: { id: fileRow.id },
    data: {
      parsedText,
      documentType: classification.documentType as CaseFileDocumentType,
      classificationStatus:
        classification.classificationStatus as CaseFileClassificationStatus,
      classificationConfidence: classification.classificationConfidence,
      classificationSource: classification.classificationSource,
      classificationSignals: classification.classificationSignals as any,
      classifiedAt: new Date()
    }
  });

  const shouldExtractGutachten =
    classification.documentType === 'GUTACHTEN_MAIN' &&
    classification.classificationStatus === 'CLASSIFIED' &&
    classification.classificationConfidence !== 'LOW';

  if (shouldExtractGutachten) {
    const insights = extractGutachtenInsightsFromText(parsedText);

    await upsertCaseGutachtenInsights({
      caseId: input.caseId,
      sourceCaseFileId: fileRow.id,
      insights,
      rawExtractionJson: { source: 'rule_based_v1' }
    });
  }

  return {
    ok: true,
    degraded: false,
    fileId: fileRow.id,
    parsedTextLength: parsedText.length,
    documentType: classification.documentType,
    classificationStatus: classification.classificationStatus,
    classificationConfidence: classification.classificationConfidence,
    extractedGutachten: shouldExtractGutachten
  };
}
