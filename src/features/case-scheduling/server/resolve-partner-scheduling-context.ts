import { requireRole, isPartner } from '@/lib/rbac';
import { getPartnerSchedulingContext } from '../lib/get-partner-scheduling-context';

export async function resolvePartnerSchedulingContext() {
  const guard = await requireRole();

  if (!guard.ok) {
    return {
      error: {
        status: guard.status,
        error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
      }
    } as const;
  }

  if (!isPartner(guard.role)) {
    return {
      error: {
        status: 403,
        error: 'Forbidden'
      }
    } as const;
  }

  const context = await getPartnerSchedulingContext({
    clerkUserId: guard.userId!,
    role: guard.role as 'GUTACHTER' | 'ANWALT'
  });

  if (!context) {
    return {
      error: {
        status: 400,
        error: 'partner profile missing'
      }
    } as const;
  }

  return {
    context,
    guard
  } as const;
}
