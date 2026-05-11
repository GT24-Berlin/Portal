import { prisma } from '@/lib/prisma';
import { emptyGutachtenInsights, type GutachtenInsights } from '../types';

export async function getCaseGutachtenInsights(input: {
  caseId: string;
  gutachtenFileId?: string | null;
}): Promise<GutachtenInsights> {
  const model = (prisma as any).caseGutachtenInsight;

  if (!model?.findUnique) {
    return emptyGutachtenInsights(
      input.gutachtenFileId ? 'AVAILABLE_UNPARSED' : 'NOT_AVAILABLE'
    );
  }

  const row = await model.findUnique({
    where: { caseId: input.caseId }
  });

  if (!row) {
    return emptyGutachtenInsights(
      input.gutachtenFileId ? 'AVAILABLE_UNPARSED' : 'NOT_AVAILABLE'
    );
  }

  return {
    status: (row.status as GutachtenInsights['status']) ?? 'AVAILABLE_UNPARSED',
    summaryShort: row.summaryShort ?? null,

    schadenshoeheNetto:
      row.schadenshoeheNetto !== null ? Number(row.schadenshoeheNetto) : null,
    schadenshoeheBrutto:
      row.schadenshoeheBrutto !== null ? Number(row.schadenshoeheBrutto) : null,
    geschaetzterAnspruch:
      row.geschaetzterAnspruch !== null
        ? Number(row.geschaetzterAnspruch)
        : null,

    reparaturkostenNetto:
      row.reparaturkostenNetto !== null
        ? Number(row.reparaturkostenNetto)
        : null,
    reparaturkostenBrutto:
      row.reparaturkostenBrutto !== null
        ? Number(row.reparaturkostenBrutto)
        : null,
    wiederbeschaffungswert:
      row.wiederbeschaffungswert !== null
        ? Number(row.wiederbeschaffungswert)
        : null,
    restwert: row.restwert !== null ? Number(row.restwert) : null,
    wertminderung:
      row.wertminderung !== null ? Number(row.wertminderung) : null,
    nutzungsausfallProTag:
      row.nutzungsausfallProTag !== null
        ? Number(row.nutzungsausfallProTag)
        : null,
    reparaturdauerArbeitstage: row.reparaturdauerArbeitstage ?? null,

    abrechnungsart: row.abrechnungsart ?? null,
    mietwagenklasse: row.mietwagenklasse ?? null,
    reparaturwuerdig: row.reparaturwuerdig ?? null,

    notes: row.notes ?? null
  };
}
