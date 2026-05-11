export type CustomerJourneyStep = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
};

export type CustomerJourneyData = {
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
  summary: string;
  shortStatus: string;
  nextStepHint: string;
  customerAction: string | null;
  steps: CustomerJourneyStep[];
};
