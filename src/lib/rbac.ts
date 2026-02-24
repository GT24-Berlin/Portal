import { auth, currentUser } from '@clerk/nextjs/server';

export type Role = 'ADMIN' | 'GUTACHTER' | 'ANWALT' | '';

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId)
    return { ok: false as const, status: 401 as const, userId: null };
  return { ok: true as const, status: 200 as const, userId };
}

export async function getRole(): Promise<Role> {
  const user = await currentUser();
  return String(user?.publicMetadata?.role ?? '') as Role;
}

export function isAdmin(role: Role) {
  return role === 'ADMIN';
}

export function isPartner(role: Role) {
  return role === 'GUTACHTER' || role === 'ANWALT';
}
