import { prisma } from '@/lib/prisma';
import type {
  AdminActivityDayItem,
  AdminAssignmentStatusItem,
  AdminDashboardData,
  AdminKpiCard,
  AdminOpsCaseRow,
  AdminRecentOpRow
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

function toCaseRow(c: any): AdminOpsCaseRow {
  return {
    caseId: c.id,
    caseNumber: c.caseNumber ?? null,
    token: c.token,
    updatedAt: c.updatedAt,
    leadExternalId: c.lead?.externalId ?? null,
    gutachterStatus: String(c.gutachterStatus ?? ''),
    anwaltStatus: String(c.anwaltStatus ?? '')
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const since7d = daysAgo(7);

  const [
    openCasesCount,
    unverifiedCustomersCount,
    withoutGutachterCount,
    withoutAnwaltCount,
    pendingAssignmentsCount,
    problemCasesCount,
    uploadsLast7dCount,
    otpIssuesLast7dCount,
    pendingStatusCount,
    acceptedStatusCount,
    releasedStatusCount,
    expiredStatusCount,
    uploadsLast7dRows,
    otpIssuesLast7dRows,
    operationalEventsLast7dRows,
    withoutGutachterCases,
    withoutAnwaltCases,
    pendingCases,
    recentOps
  ] = await Promise.all([
    prisma.case.count(),

    prisma.case.count({
      where: {
        customer: {
          is: {
            otpVerifiedAt: null
          }
        }
      }
    }),

    prisma.case.count({
      where: {
        assignments: {
          none: {
            role: 'GUTACHTER',
            activeKey: 'ACTIVE'
          }
        }
      }
    }),

    prisma.case.count({
      where: {
        assignments: {
          none: {
            role: 'ANWALT',
            activeKey: 'ACTIVE'
          }
        }
      }
    }),

    prisma.case.count({
      where: {
        assignments: {
          some: {
            activeKey: 'ACTIVE',
            status: 'PENDING'
          }
        }
      }
    }),

    prisma.case.count({
      where: {
        assignments: {
          some: {
            status: { in: ['EXPIRED', 'RELEASED'] as any }
          }
        }
      }
    }),

    prisma.caseFile.count({
      where: {
        createdAt: {
          gte: since7d
        }
      }
    }),

    prisma.operationalEvent.count({
      where: {
        createdAt: {
          gte: since7d
        },
        domain: 'OTP',
        result: {
          in: ['DENIED', 'EXPIRED', 'FAILED']
        }
      }
    }),

    prisma.caseAssignment.count({
      where: { status: 'PENDING' as any }
    }),

    prisma.caseAssignment.count({
      where: { status: 'ACCEPTED' as any }
    }),

    prisma.caseAssignment.count({
      where: { status: 'RELEASED' as any }
    }),

    prisma.caseAssignment.count({
      where: { status: 'EXPIRED' as any }
    }),

    prisma.caseFile.findMany({
      where: {
        createdAt: {
          gte: since7d
        }
      },
      select: {
        createdAt: true
      }
    }),

    prisma.operationalEvent.findMany({
      where: {
        createdAt: {
          gte: since7d
        },
        domain: 'OTP',
        result: {
          in: ['DENIED', 'EXPIRED', 'FAILED']
        }
      },
      select: {
        createdAt: true
      }
    }),

    prisma.operationalEvent.findMany({
      where: {
        createdAt: {
          gte: since7d
        }
      },
      select: {
        createdAt: true
      }
    }),

    prisma.case.findMany({
      where: {
        assignments: {
          none: {
            role: 'GUTACHTER',
            activeKey: 'ACTIVE'
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        lead: true
      }
    }),

    prisma.case.findMany({
      where: {
        assignments: {
          none: {
            role: 'ANWALT',
            activeKey: 'ACTIVE'
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        lead: true
      }
    }),

    prisma.case.findMany({
      where: {
        assignments: {
          some: {
            activeKey: 'ACTIVE',
            status: 'PENDING'
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        lead: true
      }
    }),

    prisma.operationalEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        caseId: true,
        createdAt: true,
        domain: true,
        action: true,
        result: true,
        actorType: true,
        message: true
      }
    })
  ]);

  const kpis: AdminKpiCard[] = [
    {
      key: 'open_cases',
      label: 'Offene Fälle',
      value: openCasesCount,
      hint: 'Alle Cases im System'
    },
    {
      key: 'unverified_customers',
      label: 'Unverifizierte Kunden',
      value: unverifiedCustomersCount,
      hint: 'Customer ohne OTP-Verifikation'
    },
    {
      key: 'without_gutachter',
      label: 'Ohne Gutachter',
      value: withoutGutachterCount,
      hint: 'Kein aktives Gutachter-Assignment'
    },
    {
      key: 'without_anwalt',
      label: 'Ohne Anwalt',
      value: withoutAnwaltCount,
      hint: 'Kein aktives Anwalt-Assignment'
    },
    {
      key: 'pending_assignments',
      label: 'PENDING Assignments',
      value: pendingAssignmentsCount,
      hint: 'Aktive Zuweisungen mit Status PENDING'
    },
    {
      key: 'problem_cases',
      label: 'Problemfälle',
      value: problemCasesCount,
      hint: 'Mind. ein Assignment RELEASED/EXPIRED'
    },
    {
      key: 'uploads_last_7d',
      label: 'Uploads 7 Tage',
      value: uploadsLast7dCount,
      hint: 'Alle CaseFile Uploads der letzten 7 Tage'
    },
    {
      key: 'otp_issues_last_7d',
      label: 'OTP-Probleme 7 Tage',
      value: otpIssuesLast7dCount,
      hint: 'OTP Events mit DENIED/EXPIRED/FAILED'
    }
  ];

  const assignmentStatus: AdminAssignmentStatusItem[] = [
    { status: 'PENDING', value: pendingStatusCount },
    { status: 'ACCEPTED', value: acceptedStatusCount },
    { status: 'RELEASED', value: releasedStatusCount },
    { status: 'EXPIRED', value: expiredStatusCount }
  ];

  const activityLast7d: AdminActivityDayItem[] = Array.from({ length: 7 }).map(
    (_, index) => {
      const day = startOfDay(daysAgo(6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const uploads = uploadsLast7dRows.filter(
        (row) => row.createdAt >= day && row.createdAt < nextDay
      ).length;

      const otpIssues = otpIssuesLast7dRows.filter(
        (row) => row.createdAt >= day && row.createdAt < nextDay
      ).length;

      const operationalEvents = operationalEventsLast7dRows.filter(
        (row) => row.createdAt >= day && row.createdAt < nextDay
      ).length;

      return {
        dateLabel: formatDayLabel(day),
        uploads,
        otpIssues,
        operationalEvents
      };
    }
  );

  return {
    kpis,
    assignmentStatus,
    activityLast7d,
    withoutGutachter: withoutGutachterCases.map(toCaseRow),
    withoutAnwalt: withoutAnwaltCases.map(toCaseRow),
    pendingCases: pendingCases.map(toCaseRow),
    recentOps: recentOps as AdminRecentOpRow[]
  };
}
