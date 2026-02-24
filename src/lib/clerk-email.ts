import { clerkClient } from '@clerk/nextjs/server';

export async function getPrimaryEmailForClerkUser(userId: string) {
  const anyClient: any = clerkClient as any;
  const client =
    typeof anyClient === 'function' ? await anyClient() : anyClient;

  // fallback: manche Versionen liefern direkt users-API oder nested anders
  const usersApi =
    client?.users ??
    client?.client?.users ??
    client?.clerkClient?.users ??
    null;

  if (!usersApi?.getUser) {
    throw new Error('Clerk users API not available (no users.getUser).');
  }

  const u = await usersApi.getUser(userId);

  const primary =
    u.emailAddresses?.find((e: any) => e.id === u.primaryEmailAddressId) ??
    u.emailAddresses?.[0];

  return primary?.emailAddress ?? null;
}
