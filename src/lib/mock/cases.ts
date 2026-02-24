export type CaseStatus =
  | 'Neu'
  | 'In Prüfung'
  | 'In Bearbeitung'
  | 'Abgerechnet'
  | 'Storniert';

export type Case = {
  id: string;
  leadId: string;
  status: CaseStatus;
  updatedAt: string;
};

export const casesMock: Case[] = [
  { id: 'CS-2001', leadId: 'LD-1003', status: 'Neu', updatedAt: '2026-01-26' },
  {
    id: 'CS-2002',
    leadId: 'LD-1004',
    status: 'In Bearbeitung',
    updatedAt: '2026-01-26'
  }
];
