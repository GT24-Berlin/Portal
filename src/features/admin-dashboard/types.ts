export type AdminKpiKey =
  | 'open_cases'
  | 'unverified_customers'
  | 'without_gutachter'
  | 'without_anwalt'
  | 'pending_assignments'
  | 'problem_cases'
  | 'uploads_last_7d'
  | 'otp_issues_last_7d';

export type AdminKpiCard = {
  key: AdminKpiKey;
  label: string;
  value: number;
  hint?: string | null;
};

export type AdminOpsCaseRow = {
  caseId: string;
  caseNumber: string | null;
  token: string;
  updatedAt: Date;
  leadExternalId: string | null;
  gutachterStatus: string;
  anwaltStatus: string;
};

export type AdminRecentOpRow = {
  id: string;
  caseId: string | null;
  createdAt: Date;
  domain: string;
  action: string;
  result: string;
  actorType: string | null;
  message: string | null;
};

export type AdminAssignmentStatusItem = {
  status: 'PENDING' | 'ACCEPTED' | 'RELEASED' | 'EXPIRED';
  value: number;
};

export type AdminActivityDayItem = {
  dateLabel: string;
  uploads: number;
  otpIssues: number;
  operationalEvents: number;
};

export type AdminDashboardData = {
  kpis: AdminKpiCard[];
  assignmentStatus: AdminAssignmentStatusItem[];
  activityLast7d: AdminActivityDayItem[];
  withoutGutachter: AdminOpsCaseRow[];
  withoutAnwalt: AdminOpsCaseRow[];
  pendingCases: AdminOpsCaseRow[];
  recentOps: AdminRecentOpRow[];
};
