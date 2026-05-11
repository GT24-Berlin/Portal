import { prisma } from '@/lib/prisma';
import type { GutachtenInsights } from '../types';

export async function upsertCaseGutachtenInsights(input: {
  caseId: string;
  sourceCaseFileId?: string | null;
  insights: GutachtenInsights;
  rawExtractionJson?: unknown;
}) {
  const i = input.insights;

  return prisma.caseGutachtenInsight.upsert({
    where: { caseId: input.caseId },
    create: {
      caseId: input.caseId,
      sourceCaseFileId: input.sourceCaseFileId ?? null,
      status: i.status,
      summaryShort: i.summaryShort,
      schadenshoeheNetto: i.schadenshoeheNetto,
      schadenshoeheBrutto: i.schadenshoeheBrutto,
      geschaetzterAnspruch: i.geschaetzterAnspruch,
      reparaturkostenNetto: i.reparaturkostenNetto,
      reparaturkostenBrutto: i.reparaturkostenBrutto,
      wiederbeschaffungswert: i.wiederbeschaffungswert,
      restwert: i.restwert,
      wertminderung: i.wertminderung,
      nutzungsausfallProTag: i.nutzungsausfallProTag,
      reparaturdauerArbeitstage: i.reparaturdauerArbeitstage,
      abrechnungsart: i.abrechnungsart,
      mietwagenklasse: i.mietwagenklasse,
      reparaturwuerdig: i.reparaturwuerdig,
      notes: i.notes,
      rawExtractionJson: input.rawExtractionJson as any,
      extractedAt: i.status === 'PARSED' ? new Date() : null
    },
    update: {
      sourceCaseFileId: input.sourceCaseFileId ?? null,
      status: i.status,
      summaryShort: i.summaryShort,
      schadenshoeheNetto: i.schadenshoeheNetto,
      schadenshoeheBrutto: i.schadenshoeheBrutto,
      geschaetzterAnspruch: i.geschaetzterAnspruch,
      reparaturkostenNetto: i.reparaturkostenNetto,
      reparaturkostenBrutto: i.reparaturkostenBrutto,
      wiederbeschaffungswert: i.wiederbeschaffungswert,
      restwert: i.restwert,
      wertminderung: i.wertminderung,
      nutzungsausfallProTag: i.nutzungsausfallProTag,
      reparaturdauerArbeitstage: i.reparaturdauerArbeitstage,
      abrechnungsart: i.abrechnungsart,
      mietwagenklasse: i.mietwagenklasse,
      reparaturwuerdig: i.reparaturwuerdig,
      notes: i.notes,
      rawExtractionJson: input.rawExtractionJson as any,
      extractedAt: i.status === 'PARSED' ? new Date() : null
    }
  });
}
