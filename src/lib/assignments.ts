import { prisma } from '@/lib/prisma';

type MinimalAssignment = {
  id: string;
  status: string;
  expiresAt: Date;
  active?: boolean | null;
  activeKey?: string | null;
};

export function isAssignmentActiveByKey(
  assignment: Pick<MinimalAssignment, 'activeKey'>
) {
  return assignment.activeKey === 'ACTIVE';
}

export function isAssignmentExpired(
  assignment: Pick<MinimalAssignment, 'status' | 'expiresAt'>,
  now = new Date()
) {
  return assignment.status === 'PENDING' && assignment.expiresAt <= now;
}

export async function expireAssignmentIfNeeded(
  assignment: MinimalAssignment,
  now = new Date()
) {
  if (!isAssignmentExpired(assignment, now)) {
    return {
      expired: false as const,
      assignment
    };
  }

  const updated = await prisma.caseAssignment.update({
    where: { id: assignment.id },
    data: {
      status: 'EXPIRED' as any,
      active: false,
      activeKey: null
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      active: true,
      activeKey: true
    }
  });

  return {
    expired: true as const,
    assignment: updated
  };
}

export function isAssignmentUsable(
  assignment: Pick<MinimalAssignment, 'status' | 'activeKey'>
) {
  if (assignment.activeKey !== 'ACTIVE') return false;
  if (assignment.status === 'RELEASED') return false;
  if (assignment.status === 'EXPIRED') return false;
  return true;
}
