import {
  CaseAppointmentDuration,
  CaseAppointmentRequestStatus,
  CaseAppointmentRole,
  CaseAppointmentType
} from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { PartnerAppointmentRequestRow } from '../types';

export type PartnerAppointmentRequestRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  caseId: string;
  partnerId: string;
  role: CaseAppointmentRole;
  appointmentType: CaseAppointmentType;
  duration: CaseAppointmentDuration;
  status: CaseAppointmentRequestStatus;
  requestedStartAt: Date;
  requestedEndAt: Date;
  expiresAt: Date;
  customerNote: string | null;
  partnerResponseNote: string | null;
  confirmedAt: Date | null;
  declinedAt: Date | null;
  cancelledAt: Date | null;
  case: { caseNumber: string | null; token: string };
  proposals: {
    proposedStartAt: Date;
    proposedEndAt: Date;
    note: string | null;
  }[];
};

export const OPEN_APPOINTMENT_REQUEST_STATUSES = [
  CaseAppointmentRequestStatus.REQUESTED,
  CaseAppointmentRequestStatus.ALTERNATIVE_PROPOSED
] as const;

export function canRespondToAppointmentRequest(
  status: CaseAppointmentRequestStatus
) {
  return (
    status === CaseAppointmentRequestStatus.REQUESTED ||
    status === CaseAppointmentRequestStatus.ALTERNATIVE_PROPOSED
  );
}

export function canProposeAlternative(status: CaseAppointmentRequestStatus) {
  return (
    status === CaseAppointmentRequestStatus.REQUESTED ||
    status === CaseAppointmentRequestStatus.ALTERNATIVE_PROPOSED
  );
}

function toRow(
  row: PartnerAppointmentRequestRecord
): PartnerAppointmentRequestRow {
  const latestProposal = row.proposals[0] ?? null;

  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    caseId: row.caseId,
    caseNumber: row.case.caseNumber ?? null,
    token: row.case.token,
    partnerId: row.partnerId,
    role: row.role,
    appointmentType: row.appointmentType,
    duration: row.duration,
    status: row.status,
    requestedStartAt: row.requestedStartAt.toISOString(),
    requestedEndAt: row.requestedEndAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    customerNote: row.customerNote,
    partnerResponseNote: row.partnerResponseNote,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    declinedAt: row.declinedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    latestProposalStartAt:
      latestProposal?.proposedStartAt.toISOString() ?? null,
    latestProposalEndAt: latestProposal?.proposedEndAt.toISOString() ?? null,
    latestProposalNote: latestProposal?.note ?? null
  };
}

export async function loadPartnerAppointmentRequests(partnerId: string) {
  const rows = (await prisma.caseAppointmentRequest.findMany({
    where: {
      partnerId
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      caseId: true,
      partnerId: true,
      role: true,
      appointmentType: true,
      duration: true,
      status: true,
      requestedStartAt: true,
      requestedEndAt: true,
      expiresAt: true,
      customerNote: true,
      partnerResponseNote: true,
      confirmedAt: true,
      declinedAt: true,
      cancelledAt: true,
      case: {
        select: {
          caseNumber: true,
          token: true
        }
      },
      proposals: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          proposedStartAt: true,
          proposedEndAt: true,
          note: true
        }
      }
    }
  })) as PartnerAppointmentRequestRecord[];

  return rows.map(toRow);
}

export async function loadPartnerAppointmentRequestRecord(
  partnerId: string,
  requestId: string
) {
  const row = (await prisma.caseAppointmentRequest.findFirst({
    where: {
      id: requestId,
      partnerId
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      caseId: true,
      partnerId: true,
      role: true,
      appointmentType: true,
      duration: true,
      status: true,
      requestedStartAt: true,
      requestedEndAt: true,
      expiresAt: true,
      customerNote: true,
      partnerResponseNote: true,
      confirmedAt: true,
      declinedAt: true,
      cancelledAt: true,
      case: {
        select: {
          caseNumber: true,
          token: true
        }
      },
      proposals: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          proposedStartAt: true,
          proposedEndAt: true,
          note: true
        }
      }
    }
  })) as PartnerAppointmentRequestRecord | null;

  return row;
}

export async function loadPartnerAppointmentRequest(
  partnerId: string,
  requestId: string
) {
  const row = await loadPartnerAppointmentRequestRecord(partnerId, requestId);

  return row ? toRow(row) : null;
}

export function extractLatestProposal(input: {
  latestProposalStartAt: string | null;
  latestProposalEndAt: string | null;
  latestProposalNote: string | null;
}) {
  return {
    proposedStartAt: input.latestProposalStartAt,
    proposedEndAt: input.latestProposalEndAt,
    note: input.latestProposalNote
  };
}
