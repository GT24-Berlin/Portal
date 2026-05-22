import { prisma } from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import type {
  PartnerCollaborationData,
  PartnerCollaborationRow
} from '../types';

async function getClerk() {
  return typeof clerkClient === 'function' ? await clerkClient() : clerkClient;
}

export async function getPartnerCollaboration(input: {
  clerkUserId: string;
  role: 'GUTACHTER' | 'ANWALT';
}): Promise<PartnerCollaborationData> {
  const counterpartRole = input.role === 'GUTACHTER' ? 'ANWALT' : 'GUTACHTER';

  try {
    const cases = await prisma.case.findMany({
      where: {
        assignments: {
          some: {
            assigneeClerkUserId: input.clerkUserId,
            role: input.role as any,
            activeKey: 'ACTIVE'
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        caseNumber: true,
        token: true,
        updatedAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        gutachterStatus: true,
        anwaltStatus: true,
        assignments: {
          orderBy: { assignedAt: 'desc' },
          select: {
            role: true,
            status: true,
            assigneeClerkUserId: true,
            activeKey: true
          }
        }
      }
    });

    const counterpartIds = Array.from(
      new Set(
        cases
          .map(
            (c) =>
              c.assignments.find(
                (a) => a.role === counterpartRole && a.activeKey === 'ACTIVE'
              )?.assigneeClerkUserId
          )
          .filter(Boolean)
      )
    ) as string[];

    const userMap = new Map<
      string,
      { name: string | null; email: string | null }
    >();

    if (counterpartIds.length > 0) {
      try {
        const client = await getClerk();
        const users = await Promise.all(
          counterpartIds.map(async (id) => {
            try {
              const u = await client.users.getUser(id);
              const name =
                [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
                u.username ||
                u.primaryEmailAddress?.emailAddress ||
                id;

              return {
                id,
                name,
                email: u.primaryEmailAddress?.emailAddress ?? null
              };
            } catch {
              return {
                id,
                name: id,
                email: null
              };
            }
          })
        );

        for (const u of users) {
          userMap.set(u.id, {
            name: u.name,
            email: u.email
          });
        }
      } catch {
        console.warn(
          'Partner collaboration user lookup degraded: Clerk lookup failed'
        );
      }
    }

    const items: PartnerCollaborationRow[] = cases.map((c) => {
      const ownAssignment =
        c.assignments.find(
          (a) =>
            a.role === input.role &&
            a.assigneeClerkUserId === input.clerkUserId &&
            a.activeKey === 'ACTIVE'
        ) ?? null;

      const counterpartAssignment =
        c.assignments.find(
          (a) => a.role === counterpartRole && a.activeKey === 'ACTIVE'
        ) ?? null;

      const counterpartUser = counterpartAssignment?.assigneeClerkUserId
        ? (userMap.get(counterpartAssignment.assigneeClerkUserId) ?? null)
        : null;

      return {
        caseId: c.id,
        caseNumber: c.caseNumber ?? null,
        token: c.token,
        updatedAt: c.updatedAt,
        customerName:
          [c.customer?.firstName, c.customer?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || null,
        ownRole: input.role,
        ownAssignmentStatus: String(ownAssignment?.status ?? ''),
        counterpartRole,
        counterpartClerkUserId:
          counterpartAssignment?.assigneeClerkUserId ?? null,
        counterpartName: counterpartUser?.name ?? null,
        counterpartEmail: counterpartUser?.email ?? null,
        gutachterStatus: String(c.gutachterStatus ?? ''),
        anwaltStatus: String(c.anwaltStatus ?? '')
      };
    });

    return { items };
  } catch (e: any) {
    if (e?.code === 'P1001') {
      console.warn('Partner collaboration degraded: DB unreachable (P1001)');
      return { items: [] };
    }

    throw e;
  }
}
