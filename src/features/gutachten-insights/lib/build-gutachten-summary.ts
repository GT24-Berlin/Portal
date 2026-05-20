import type { GutachtenInsights } from '../types';

function fmtMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} €`;
}

export function buildGutachtenSummary(insights: GutachtenInsights): string[] {
  const lines: string[] = [];

  if (insights.reparaturwuerdig === true) {
    lines.push('Das Fahrzeug ist laut Gutachten reparaturwürdig.');
  } else if (insights.reparaturwuerdig === false) {
    lines.push(
      'Laut Gutachten ist eine Reparatur wirtschaftlich nicht sinnvoll.'
    );
  }

  const reparaturkostenBrutto = fmtMoney(insights.reparaturkostenBrutto);
  if (reparaturkostenBrutto) {
    lines.push(
      `Die voraussichtlichen Reparaturkosten liegen bei ${reparaturkostenBrutto} brutto.`
    );
  }

  const wiederbeschaffungswert = fmtMoney(insights.wiederbeschaffungswert);
  if (wiederbeschaffungswert) {
    lines.push(
      `Der Wiederbeschaffungswert wurde mit ${wiederbeschaffungswert} angesetzt.`
    );
  }

  const wertminderung = fmtMoney(insights.wertminderung);
  if (wertminderung) {
    lines.push(
      `Zusätzlich wurde eine Wertminderung von ${wertminderung} festgestellt.`
    );
  }

  const nutzungsausfall = fmtMoney(insights.nutzungsausfallProTag);
  if (nutzungsausfall) {
    lines.push(`Der Nutzungsausfall beträgt ${nutzungsausfall} pro Tag.`);
  }

  if (
    typeof insights.reparaturdauerArbeitstage === 'number' &&
    Number.isFinite(insights.reparaturdauerArbeitstage)
  ) {
    lines.push(
      `Die geschätzte Reparaturdauer liegt bei ${insights.reparaturdauerArbeitstage} Arbeitstagen.`
    );
  }

  return lines.slice(0, 5);
}
