import { prisma } from '@/lib/prisma';
import type {
  PartnerActivityDayItem,
  PartnerAssignmentStatusItem,
  PartnerCaseRow,
  PartnerDashboardData,
  PartnerKpiCard
} from '../types';

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function startOfDay(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit'
  }).format(value);
}

function toPartnerCaseRow(
  c: any,
  userId: string,
  role: 'GUTACHTER' | 'ANWALT'
): PartnerCaseRow {
  const assignment =
    c.assignments?.find(
      (a: any) =>
        a.assigneeClerkUserId === userId &&
        a.role === role &&
        a.activeKey === 'ACTIVE'
    ) ?? c.assignments?.[0];

  return {
    caseId: c.id,
    caseNumber: c.caseNumber ?? null,
    token: c.token,
    updatedAt: c.updatedAt,
    leadExternalId: c.lead?.externalId ?? null,
    gutachterStatus: String(c.gutachterStatus ?? ''),
    anwaltStatus: String(c.anwaltStatus ?? ''),
    assignmentStatus: String(assignment?.status ?? ''),
    assignmentRole: role,
    assignedAt: assignment?.assignedAt,
    expiresAt: assignment?.expiresAt
  };
}

export async function getPartnerDashboardData(input: {
  userId: string;
  role: 'GUTACHTER' | 'ANWALT';
}): Promise<PartnerDashboardData> {
  const { userId, role } = input;
  const since7d = daysAgo(7);

  const [
    pendingCasesCount,
    acceptedCasesCount,
    uploadsLast7dCount,
    recentActivityLast7dCount,
    pendingStatusCount,
    acceptedStatusCount,
    releasedStatusCount,
    expiredStatusCount,
    pendingCasesRaw,
    acceptedCasesRaw,
    uploadsLast7dRows,
    caseEventsLast7dRows
  ] = await Promise.all([
    prisma.case.count({
      where: {
        assignments: {
          some: {
            assigneeClerkUserId: userId,
            role: role as any,
            activeKey: 'ACTIVE',
            status: 'PENDING' as any
          }
        }
      }
    }),

    prisma.case.count({
      where: {
        assignments: {
          some: {
            assigneeClerkUserId: userId,
            role: role as any,
            activeKey: 'ACTIVE',
            status: 'ACCEPTED' as any
          }
        }
      }
    }),

    prisma.caseFile.count({
      where: {
        createdAt: {
          gte: since7d
        },
        role: role as any
      }
    }),

    prisma.caseEvent.count({
      where: {
        occurredAt: {
          gte: since7d
        },
        lane: role as any
      }
    }),

    prisma.caseAssignment.count({
      where: {
        assigneeClerkUserId: userId,
        role: role as any,
        status: 'PENDING' as any
      }
    }),

    prisma.caseAssignment.count({
      where: {
        assigneeClerkUserId: userId,
        role: role as any,
        status: 'ACCEPTED' as any
      }
    }),

    prisma.caseAssignment.count({
      where: {
        assigneeClerkUserId: userId,
        role: role as any,
        status: 'RELEASED' as any
      }
    }),

    prisma.caseAssignment.count({
      where: {
        assigneeClerkUserId: userId,
        role: role as any,
        status: 'EXPIRED' as any
      }
    }),

    prisma.case.findMany({
      where: {
        assignments: {
          some: {
            assigneeClerkUserId: userId,
            role: role as any,
            activeKey: 'ACTIVE',
            status: 'PENDING' as any
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        lead: true,
        assignments: true
      }
    }),

    prisma.case.findMany({
      where: {
        assignments: {
          some: {
            assigneeClerkUserId: userId,
            role: role as any,
            activeKey: 'ACTIVE',
            status: 'ACCEPTED' as any
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        lead: true,
        assignments: true
      }
    }),

    prisma.caseFile.findMany({
      where: {
        createdAt: {
          gte: since7d
        },
        role: role as any
      },
      select: {
        createdAt: true
      }
    }),

    prisma.caseEvent.findMany({
      where: {
        occurredAt: {
          gte: since7d
        },
        lane: role as any
      },
      select: {
        occurredAt: true
      }
    })
  ]);

  const kpis: PartnerKpiCard[] = [
    {
      key: 'pending_cases',
      label: 'Neue Zuweisungen',
      value: pendingCasesCount,
      hint: 'Aktive Fälle mit PENDING'
    },
    {
      key: 'accepted_cases',
      label: 'Aktive Fälle',
      value: acceptedCasesCount,
      hint: 'Aktive Fälle mit ACCEPTED'
    },
    {
      key: 'uploads_last_7d',
      label: 'Uploads 7 Tage',
      value: uploadsLast7dCount,
      hint: 'Uploads deiner Lane in den letzten 7 Tagen'
    },
    {
      key: 'recent_activity_last_7d',
      label: 'Aktivität 7 Tage',
      value: recentActivityLast7dCount,
      hint: 'Case-Events deiner Lane in den letzten 7 Tagen'
    }
  ];

  const assignmentStatus: PartnerAssignmentStatusItem[] = [
    { status: 'PENDING', value: pendingStatusCount },
    { status: 'ACCEPTED', value: acceptedStatusCount },
    { status: 'RELEASED', value: releasedStatusCount },
    { status: 'EXPIRED', value: expiredStatusCount }
  ];

  const activityLast7d: PartnerActivityDayItem[] = Array.from({
    length: 7
  }).map((_, index) => {
    const day = startOfDay(daysAgo(6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const uploads = uploadsLast7dRows.filter(
      (row) => row.createdAt >= day && row.createdAt < nextDay
    ).length;

    const caseEvents = caseEventsLast7dRows.filter(
      (row) => row.occurredAt >= day && row.occurredAt < nextDay
    ).length;

    return {
      dateLabel: formatDayLabel(day),
      uploads,
      caseEvents
    };
  });

  return {
    kpis,
    assignmentStatus,
    pendingCases: pendingCasesRaw.map((c) => toPartnerCaseRow(c, userId, role)),
    acceptedCases: acceptedCasesRaw.map((c) =>
      toPartnerCaseRow(c, userId, role)
    ),
    activityLast7d
  };
}
