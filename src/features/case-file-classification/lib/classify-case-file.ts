import type {
  CaseFileClassificationConfidence,
  CaseFileClassificationStatus,
  CaseFileDocumentType
} from '@prisma/client';

const DOC = {
  GUTACHTEN_MAIN: 'GUTACHTEN_MAIN',
  GUTACHTEN_MINDERWERTREPORT: 'GUTACHTEN_MINDERWERTREPORT',
  GUTACHTEN_ANLAGE_FOTOS: 'GUTACHTEN_ANLAGE_FOTOS',
  GUTACHTEN_AUFTRAG: 'GUTACHTEN_AUFTRAG',
  RECHNUNG: 'RECHNUNG',
  SONSTIGES: 'SONSTIGES'
} as const;

export type CaseFileClassificationResult = {
  documentType: CaseFileDocumentType;
  classificationStatus: CaseFileClassificationStatus;
  classificationConfidence: CaseFileClassificationConfidence | null;
  classificationSource: string;
  classificationSignals: string[];
};

function countSignals(text: string, signals: string[]) {
  const hits: string[] = [];

  for (const signal of signals) {
    if (text.includes(signal.toLowerCase())) {
      hits.push(signal);
    }
  }

  return hits;
}

export function classifyCaseFile(input: {
  filename?: string | null;
  title?: string | null;
  mimeType?: string | null;
  parsedText?: string | null;
}): CaseFileClassificationResult {
  const text = String(input.parsedText ?? '').toLowerCase();
  const filename = String(input.filename ?? '').toLowerCase();
  const title = String(input.title ?? '').toLowerCase();
  const mimeType = String(input.mimeType ?? '').toLowerCase();

  const combined = [filename, title, text].filter(Boolean).join('\n');

  if (!mimeType.includes('pdf')) {
    return {
      documentType: DOC.SONSTIGES as CaseFileDocumentType,
      classificationStatus: 'FAILED' as CaseFileClassificationStatus,
      classificationConfidence: null,
      classificationSource: 'RULE_BASED_V1',
      classificationSignals: ['NOT_PDF']
    };
  }

  if (!combined.trim()) {
    return {
      documentType: DOC.SONSTIGES as CaseFileDocumentType,
      classificationStatus: 'FAILED' as CaseFileClassificationStatus,
      classificationConfidence: null,
      classificationSource: 'RULE_BASED_V1',
      classificationSignals: ['NO_TEXT']
    };
  }

  const gutachtenMainSignals = countSignals(combined, [
    'haftpflichtgutachten',
    'haftpflichtschaden',
    'zusammenfassung',
    'reparaturkosten ohne mwst',
    'reparaturkosten inkl. mwst',
    'wiederbeschaffungswert',
    'wertminderung',
    'nutzungsausfall',
    'beurteilung',
    'gutachtenfertigstellung'
  ]);

  const minderwertSignals = countSignals(combined, [
    'minderwert report',
    'hamburger modell',
    'bvsk',
    'dr. schlund',
    'durchschnitt',
    'der sachverständige befürwortet einen minderwert'
  ]);

  const fotoSignals = countSignals(combined, [
    'lichtbildanlage',
    'bild 1',
    'bild 2',
    'die lichtbildanlage enthält'
  ]);

  const auftragSignals = countSignals(combined, [
    'gutachtenauftrag',
    'auftragsbestätigung',
    'gutachtenauftrag/auftragsbestätigung'
  ]);

  const rechnungSignals = countSignals(combined, [
    'rechnung',
    'rechnungs-datum',
    'rechnungs-nr',
    'betrag',
    'umsatzsteuer'
  ]);

  const scores = [
    {
      type: DOC.GUTACHTEN_MAIN as CaseFileDocumentType,
      hits: gutachtenMainSignals,
      score: gutachtenMainSignals.length
    },
    {
      type: DOC.GUTACHTEN_MINDERWERTREPORT as CaseFileDocumentType,
      hits: minderwertSignals,
      score: minderwertSignals.length
    },
    {
      type: DOC.GUTACHTEN_ANLAGE_FOTOS as CaseFileDocumentType,
      hits: fotoSignals,
      score: fotoSignals.length
    },
    {
      type: DOC.GUTACHTEN_AUFTRAG as CaseFileDocumentType,
      hits: auftragSignals,
      score: auftragSignals.length
    },
    {
      type: DOC.RECHNUNG as CaseFileDocumentType,
      hits: rechnungSignals,
      score: rechnungSignals.length
    }
  ].sort((a, b) => b.score - a.score);

  const best = scores[0];

  if (!best || best.score === 0) {
    return {
      documentType: DOC.SONSTIGES as CaseFileDocumentType,
      classificationStatus: 'CLASSIFIED' as CaseFileClassificationStatus,
      classificationConfidence: 'LOW' as CaseFileClassificationConfidence,
      classificationSource: 'RULE_BASED_V1',
      classificationSignals: []
    };
  }

  const confidence =
    best.score >= 4
      ? ('HIGH' as CaseFileClassificationConfidence)
      : best.score >= 2
        ? ('MEDIUM' as CaseFileClassificationConfidence)
        : ('LOW' as CaseFileClassificationConfidence);

  return {
    documentType: best.type,
    classificationStatus: 'CLASSIFIED' as CaseFileClassificationStatus,
    classificationConfidence: confidence,
    classificationSource: 'RULE_BASED_V1',
    classificationSignals: best.hits
  };
}
