import type { GutachtenInsights } from '../types';

export function getDemoGutachtenInsights(): GutachtenInsights {
  return {
    status: 'PARSED',
    summaryShort:
      'Reparaturfall. Das Fahrzeug ist reparaturwürdig, die Abrechnung erfolgt auf Gutachtenbasis.',
    schadenshoeheNetto: 26380.69,
    schadenshoeheBrutto: 31393.02,
    geschaetzterAnspruch: null,

    reparaturkostenNetto: 26380.69,
    reparaturkostenBrutto: 31393.02,
    wiederbeschaffungswert: 48100.0,
    restwert: null,
    wertminderung: 1900.0,
    nutzungsausfallProTag: 199,
    reparaturdauerArbeitstage: 6,

    abrechnungsart: 'Fiktive Abrechnung',
    mietwagenklasse: '05',
    reparaturwuerdig: true,

    notes: null
  };
}
