export type GutachtenInsightStatus =
  | 'NOT_AVAILABLE'
  | 'AVAILABLE_UNPARSED'
  | 'PARSED';

export type GutachtenInsights = {
  status: GutachtenInsightStatus;

  summaryShort: string | null;

  schadenshoeheNetto: number | null;
  schadenshoeheBrutto: number | null;
  geschaetzterAnspruch: number | null;

  reparaturkostenNetto: number | null;
  reparaturkostenBrutto: number | null;
  wiederbeschaffungswert: number | null;
  restwert: number | null;
  wertminderung: number | null;
  nutzungsausfallProTag: number | null;
  reparaturdauerArbeitstage: number | null;

  abrechnungsart: string | null;
  mietwagenklasse: string | null;
  reparaturwuerdig: boolean | null;

  notes: string | null;
};

export function emptyGutachtenInsights(
  status: GutachtenInsightStatus = 'NOT_AVAILABLE'
): GutachtenInsights {
  return {
    status,
    summaryShort: null,

    schadenshoeheNetto: null,
    schadenshoeheBrutto: null,
    geschaetzterAnspruch: null,

    reparaturkostenNetto: null,
    reparaturkostenBrutto: null,
    wiederbeschaffungswert: null,
    restwert: null,
    wertminderung: null,
    nutzungsausfallProTag: null,
    reparaturdauerArbeitstage: null,

    abrechnungsart: null,
    mietwagenklasse: null,
    reparaturwuerdig: null,

    notes: null
  };
}
