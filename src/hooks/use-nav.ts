'use client';

/**
 * Fully client-side hook for filtering navigation items based on RBAC
 *
 * This hook uses Clerk's client-side hooks to check permissions, roles, and organization
 * without any server calls. This is perfect for navigation visibility (UX only).
 *
 * Performance:
 * - All checks are synchronous (no server calls)
 * - Instant filtering
 * - No loading states
 * - No UI flashing
 *
 * Note: For actual security (API routes, server actions), always use server-side checks.
 * This is only for UI visibility.
 */

import { useMemo } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import type { NavItem } from '@/types';

type AccessRole = string | string[] | undefined;

function normRole(v: unknown) {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

function matchesRole(required: AccessRole, actual: string) {
  if (!required) return true;
  const reqList = Array.isArray(required)
    ? required.map(normRole)
    : [normRole(required)];
  return reqList.includes(actual);
}

export function useFilteredNavItems(items: NavItem[]) {
  const { organization, membership } = useOrganization();
  const { user } = useUser();

  const accessContext = useMemo(() => {
    const permissions = (membership?.permissions || []) as string[];
    const role = normRole((user?.publicMetadata as any)?.role);

    return {
      organization: organization ?? undefined,
      user: user ?? undefined,
      permissions,
      role,
      hasOrg: !!organization
    };
  }, [
    organization?.id,
    user?.id,
    membership?.permissions,
    (user?.publicMetadata as any)?.role
  ]);

  const filteredItems = useMemo(() => {
    const allow = (it: NavItem) => {
      if (!it.access) return true;

      // requireOrg bleibt streng
      if (it.access.requireOrg && !accessContext.hasOrg) return false;

      // permission ist org-basiert
      if (it.access.permission) {
        if (!accessContext.hasOrg) return false;
        if (!accessContext.permissions.includes(it.access.permission))
          return false;
      }

      // role funktioniert auch ohne org, und unterstützt Array
      if (it.access.role) {
        if (!matchesRole(it.access.role as any, accessContext.role))
          return false;
      }

      return true;
    };

    return items.filter(allow).map((item) => {
      if (item.items && item.items.length > 0) {
        const children = item.items.filter(allow);
        return { ...item, items: children };
      }
      return item;
    });
  }, [items, accessContext]);

  return filteredItems;
}
