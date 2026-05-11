import type { CustomerJourneyData, CustomerJourneyStep } from '../types';

const JOURNEY_STEPS = [
  { key: 'CASE_RECEIVED', label: 'Fall eingegangen' },
  { key: 'DOCUMENTS_CHECK', label: 'Unterlagen werden geprüft' },
  { key: 'EXPERT_REVIEW', label: 'Gutachten / Prüfung läuft' },
  { key: 'CLAIM_PROCESSING', label: 'Anspruch in Bearbeitung' },
  { key: 'PAYOUT_PREP', label: 'Auszahlung in Vorbereitung' },
  { key: 'DONE', label: 'Abgeschlossen' }
] as const;

function determineJourneyIndex(input: {
  gutachterStatus: string;
  anwaltStatus: string;
}) {
  const { gutachterStatus, anwaltStatus } = input;

  if (
    anwaltStatus === 'FALL_ABGESCHLOSSEN' ||
    gutachterStatus === 'ABGESCHLOSSEN'
  ) {
    return 5;
  }

  if (anwaltStatus === 'FALL_BERICHT_ERSTELLT') {
    return 4;
  }

  if (
    anwaltStatus === 'FALL_IN_PRUEFUNG' ||
    anwaltStatus === 'RUECKFRAGEN_IN_KLAERUNG'
  ) {
    return 3;
  }

  if (
    gutachterStatus === 'GUTACHTEN_IN_BEARBEITUNG' ||
    gutachterStatus === 'GUTACHTEN_ERSTELLT' ||
    gutachterStatus === 'TERMIN_GEPLANT' ||
    gutachterStatus === 'GUTACHTER_KONTAKTIERT'
  ) {
    return 2;
  }

  if (gutachterStatus === 'DATEN_UNVOLLSTAENDIG') {
    return 1;
  }

  return 0;
}

function buildSummary(index: number) {
  if (index === 5) {
    return 'Dein Fall ist abgeschlossen. Wir haben alle wesentlichen Schritte zu deinem Vorgang erfolgreich bearbeitet.';
  }

  if (index === 4) {
    return 'Dein Fall ist schon weit fortgeschritten. Aktuell bereiten wir die letzten Schritte vor, bevor der Vorgang abgeschlossen werden kann.';
  }

  if (index === 3) {
    return 'Dein Fall wird aktuell weiter geprüft und bearbeitet. Wir kümmern uns jetzt um die nächsten fachlichen und rechtlichen Schritte.';
  }

  if (index === 2) {
    return 'Dein Fall befindet sich aktuell in der fachlichen Prüfung. Das Gutachten beziehungsweise die Bewertung wird bearbeitet.';
  }

  if (index === 1) {
    return 'Wir prüfen derzeit deine Angaben und Unterlagen. So stellen wir sicher, dass dein Fall vollständig und korrekt weiterbearbeitet werden kann.';
  }

  return 'Dein Fall ist bei uns eingegangen. Wir bereiten jetzt die ersten Schritte für die weitere Bearbeitung vor.';
}

function buildCustomerAction(index: number) {
  if (index === 0) {
    return 'Du musst im Moment nichts tun. Wir melden uns, sobald wir etwas von dir benötigen.';
  }

  if (index === 1) {
    return 'Bitte halte mögliche Unterlagen bereit. Falls noch etwas fehlt, informieren wir dich direkt.';
  }

  if (index === 2) {
    return 'Aktuell ist keine weitere Aktion von dir erforderlich. Wir arbeiten im Hintergrund an der nächsten Bearbeitungsphase.';
  }

  if (index === 3) {
    return 'Dein Fall wird derzeit weiterbearbeitet. Wir informieren dich, sobald ein neuer Schritt ansteht.';
  }

  if (index === 4) {
    return 'Wir sind in einer fortgeschrittenen Phase. Bitte prüfe deinen Fallstatus regelmäßig auf neue Hinweise.';
  }

  return 'Der Vorgang ist abgeschlossen. Falls noch Fragen offen sind, kannst du dich jederzeit bei uns melden.';
}

function buildShortStatus(index: number) {
  if (index === 5) {
    return 'Dein Fall ist abgeschlossen.';
  }

  if (index === 4) {
    return 'Wir bereiten aktuell die letzten Schritte vor.';
  }

  if (index === 3) {
    return 'Dein Fall wird aktuell weiter geprüft und bearbeitet.';
  }

  if (index === 2) {
    return 'Die fachliche Prüfung deines Falls läuft.';
  }

  if (index === 1) {
    return 'Deine Unterlagen werden aktuell geprüft.';
  }

  return 'Dein Fall ist bei uns eingegangen.';
}

function buildNextStepHint(index: number) {
  if (index === 5) {
    return 'Es ist aktuell kein weiterer Bearbeitungsschritt offen.';
  }

  if (index === 4) {
    return 'Als Nächstes folgt der Abschluss deines Vorgangs.';
  }

  if (index === 3) {
    return 'Als Nächstes bereiten wir die fortgeschrittene Bearbeitung vor.';
  }

  if (index === 2) {
    return 'Als Nächstes wird dein Anspruch weiter eingeordnet und bearbeitet.';
  }

  if (index === 1) {
    return 'Als Nächstes starten wir die fachliche Prüfung deines Falls.';
  }

  return 'Als Nächstes prüfen wir deine Angaben und Unterlagen.';
}

export function getCustomerJourney(input: {
  gutachterStatus: string;
  anwaltStatus: string;
}): CustomerJourneyData {
  const currentIndex = determineJourneyIndex(input);

  const steps: CustomerJourneyStep[] = JOURNEY_STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    done: index < currentIndex,
    active: index === currentIndex
  }));

  const progressPercent = Math.round(
    (currentIndex / (JOURNEY_STEPS.length - 1)) * 100
  );

  return {
    progressPercent,
    currentLabel: JOURNEY_STEPS[currentIndex].label,
    nextLabel:
      currentIndex < JOURNEY_STEPS.length - 1
        ? JOURNEY_STEPS[currentIndex + 1].label
        : null,
    summary: buildSummary(currentIndex),
    shortStatus: buildShortStatus(currentIndex),
    nextStepHint: buildNextStepHint(currentIndex),
    customerAction: buildCustomerAction(currentIndex),
    steps
  };
}
