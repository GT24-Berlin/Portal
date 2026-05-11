import type { GutachtenInsights } from '../types';
import { emptyGutachtenInsights } from '../types';

function parseGermanMoney(text: string): number | null {
  const cleaned = text.replace(/\./g, '').replace(',', '.').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function matchMoney(content: string, label: RegExp): number | null {
  const m = content.match(label);
  if (!m?.[1]) return null;
  return parseGermanMoney(m[1]);
}

function matchInt(content: string, label: RegExp): number | null {
  const m = content.match(label);
  if (!m?.[1]) return null;
  const num = Number(m[1]);
  return Number.isFinite(num) ? num : null;
}

function matchText(content: string, label: RegExp): string | null {
  const m = content.match(label);
  return m?.[1]?.trim() ?? null;
}

export function extractGutachtenInsightsFromText(
  content: string
): GutachtenInsights {
  const insights = emptyGutachtenInsights('AVAILABLE_UNPARSED');

  const reparaturkostenNetto = matchMoney(
    content,
    /Reparaturkosten netto\s*€?\s*([\d\.\,]+)/i
  );

  const reparaturkostenBrutto =
    matchMoney(content, /Reparaturkosten brutto\s*€?\s*([\d\.\,]+)/i) ??
    matchMoney(
      content,
      /Endsumme inkl\.\s*19,00\s*%\s*MwSt\.\s*und Abzügen\s*€?\s*([\d\.\,]+)/i
    );

  const wiederbeschaffungswert = matchMoney(
    content,
    /Wiederbeschaffungswert[^\n\r]*?([\d\.\,]+)\s*€/i
  );

  const wertminderung = matchMoney(
    content,
    /Wertminderung[^\n\r]*?([\d\.\,]+)\s*€/i
  );

  const nutzungsausfallProTag = matchMoney(
    content,
    /Nutzungsausfallentschädigung pro Kalendertag[^\n\r]*?([\d\.\,]+)\s*€/i
  );

  const reparaturdauerArbeitstage =
    matchInt(
      content,
      /Reparaturdauer\s*\(Arbeitstage\)[^\n\r]*?(\d+)\s*Arb\.-Tage/i
    ) ?? matchInt(content, /vorraussichtlich\s+(\d+)\s*Arb\.-Tage/i);

  const abrechnungsart = matchText(content, /Art der Abrechnung\s*([^\n\r]+)/i);

  const mietwagenklasse = matchText(
    content,
    /Mietwagenklasse\s*([A-Za-z0-9]+)/i
  );

  const reparaturwuerdig =
    /Reparaturwürdigkeit festgestellt/i.test(content) ||
    /rechtfertigt aus technischer\/wirtschaftlicher Sicht die Durchführung der Reparatur/i.test(
      content
    )
      ? true
      : null;

  const summaryParts: string[] = [];

  if (reparaturwuerdig === true) {
    summaryParts.push('Das Fahrzeug ist laut Gutachten reparaturwürdig.');
  }

  if (reparaturkostenBrutto !== null) {
    summaryParts.push(
      `Die kalkulierten Reparaturkosten betragen ${reparaturkostenBrutto.toLocaleString(
        'de-DE',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )} € brutto.`
    );
  }

  if (wertminderung !== null) {
    summaryParts.push(
      `Zusätzlich wurde eine Wertminderung von ${wertminderung.toLocaleString(
        'de-DE',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )} € festgestellt.`
    );
  }

  if (nutzungsausfallProTag !== null) {
    summaryParts.push(
      `Der mögliche Nutzungsausfall beträgt ${nutzungsausfallProTag.toLocaleString(
        'de-DE',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )} € pro Tag.`
    );
  }

  const hasAnyValue =
    reparaturkostenNetto !== null ||
    reparaturkostenBrutto !== null ||
    wiederbeschaffungswert !== null ||
    wertminderung !== null ||
    nutzungsausfallProTag !== null ||
    reparaturdauerArbeitstage !== null ||
    abrechnungsart !== null ||
    mietwagenklasse !== null ||
    reparaturwuerdig !== null;

  return {
    status: hasAnyValue ? 'PARSED' : 'AVAILABLE_UNPARSED',
    summaryShort: summaryParts.length ? summaryParts.join(' ') : null,

    schadenshoeheNetto: reparaturkostenNetto,
    schadenshoeheBrutto: reparaturkostenBrutto,
    geschaetzterAnspruch: null,

    reparaturkostenNetto,
    reparaturkostenBrutto,
    wiederbeschaffungswert,
    restwert: null,
    wertminderung,
    nutzungsausfallProTag,
    reparaturdauerArbeitstage,

    abrechnungsart,
    mietwagenklasse,
    reparaturwuerdig,

    notes: null
  };
}
