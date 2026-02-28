import { auth, currentUser } from '@clerk/nextjs/server';

export type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

export function normalizeRole(input: any): Role {
  const s = String(input ?? '')
    .trim()
    .toUpperCase();
  if (s === 'ADMIN' || s === 'GUTACHTER' || s === 'ANWALT') return s;
  return '';
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId)
    return { ok: false as const, status: 401 as const, userId: null };
  return { ok: true as const, status: 200 as const, userId };
}

export async function requireRole() {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false as const,
      status: 401 as const,
      userId: null,
      role: '' as Role
    };
  }

  const user = await currentUser();
  const role = normalizeRole(user?.publicMetadata?.role);

  return { ok: true as const, status: 200 as const, userId, role };
}

export async function requireAdmin() {
  const guard = await requireRole();
  if (!guard.ok) return guard;
  if (guard.role !== 'ADMIN') {
    return {
      ok: false as const,
      status: 403 as const,
      userId: guard.userId,
      role: guard.role
    };
  }
  return guard;
}

export function isAdmin(role: Role) {
  return role === 'ADMIN';
}

export function isPartner(role: Role) {
  return role === 'GUTACHTER' || role === 'ANWALT';
}
