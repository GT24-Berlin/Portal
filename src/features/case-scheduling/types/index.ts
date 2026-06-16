import type {
  CaseAppointmentDuration,
  CaseAppointmentRole,
  CaseAppointmentType
} from '@prisma/client';

export type CaseSchedulingRole = 'GUTACHTER' | 'ANWALT';
export type CaseSchedulingType = 'PHONE' | 'IN_PERSON';
export type CaseSchedulingDuration = 15 | 30;
export type CaseSchedulingRequestStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'ALTERNATIVE_PROPOSED'
  | 'EXPIRED'
  | 'CANCELLED';

export type AvailableAppointmentSlot = {
  partnerId: string;
  role: CaseAppointmentRole;
  appointmentType: CaseAppointmentType;
  duration: CaseAppointmentDuration;
  startAt: string;
  endAt: string;
  bufferMinutes: number;
};

export type PartnerAvailabilitySlotRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  partnerId: string;
  role: CaseSchedulingRole;
  appointmentType: CaseSchedulingType;
  duration: 'MINUTES_15' | 'MINUTES_30';
  weekday: number;
  startTime: string;
  endTime: string;
  bufferMinutes: number;
  isActive: boolean;
  specificDate: string | null; // null = recurring weekly, ISO string = one-time date
};

export type CaseAppointmentRequestRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  caseId: string;
  partnerId: string;
  role: CaseAppointmentRole;
  appointmentType: CaseAppointmentType;
  duration: CaseAppointmentDuration;
  status: CaseSchedulingRequestStatus;
  requestedStartAt: string;
  requestedEndAt: string;
  expiresAt: string;
  customerNote: string | null;
  partnerResponseNote: string | null;
  confirmedAt: string | null;
  declinedAt: string | null;
  cancelledAt: string | null;
  latestProposalStartAt: string | null;
  latestProposalEndAt: string | null;
  latestProposalNote: string | null;
};

export type PartnerAppointmentRequestRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  caseId: string;
  caseNumber: string | null;
  token: string;
  partnerId: string;
  role: CaseAppointmentRole;
  appointmentType: CaseAppointmentType;
  duration: CaseAppointmentDuration;
  status: CaseSchedulingRequestStatus;
  requestedStartAt: string;
  requestedEndAt: string;
  expiresAt: string;
  customerNote: string | null;
  partnerResponseNote: string | null;
  confirmedAt: string | null;
  declinedAt: string | null;
  cancelledAt: string | null;
  latestProposalStartAt: string | null;
  latestProposalEndAt: string | null;
  latestProposalNote: string | null;
};
