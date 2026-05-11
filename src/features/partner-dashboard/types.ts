export type PartnerKpiKey =
  | 'pending_cases'
  | 'accepted_cases'
  | 'uploads_last_7d'
  | 'recent_activity_last_7d';

export type PartnerKpiCard = {
  key: PartnerKpiKey;
  label: string;
  value: number;
  hint?: string | null;
};

export type PartnerCaseRow = {
  caseId: string;
  caseNumber: string | null;
  token: string;
  updatedAt: Date;
  leadExternalId: string | null;
  gutachterStatus: string;
  anwaltStatus: string;
  assignmentStatus: string;
  assignmentRole: 'GUTACHTER' | 'ANWALT';
  assignedAt: Date;
  expiresAt: Date;
};

export type PartnerActivityDayItem = {
  dateLabel: string;
  uploads: number;
  caseEvents: number;
};

export type PartnerAssignmentStatusItem = {
  status: 'PENDING' | 'ACCEPTED' | 'RELEASED' | 'EXPIRED';
  value: number;
};

export type PartnerDashboardData = {
  kpis: PartnerKpiCard[];
  assignmentStatus: PartnerAssignmentStatusItem[];
  pendingCases: PartnerCaseRow[];
  acceptedCases: PartnerCaseRow[];
  activityLast7d: PartnerActivityDayItem[];
};
