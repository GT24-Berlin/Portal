import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/_debug/email?userId=...
 * Liefert primary email (oder erste email) für einen Clerk User.
 * Nur wenn eingeloggt (sonst 401).
 */
export async function GET(req: Request) {
  const { userId: callerId } = await auth();
  if (!callerId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get('userId')?.trim();

  if (!targetUserId) {
    return NextResponse.json(
      { ok: false, error: 'userId missing' },
      { status: 400 }
    );
  }

  try {
    // clerkClient kann je nach Setup Objekt oder Funktion sein
    const anyClient: any = clerkClient as any;
    const client =
      typeof anyClient === 'function' ? await anyClient() : anyClient;

    const u = await client.users.getUser(targetUserId);

    const primary =
      u.emailAddresses?.find((e: any) => e.id === u.primaryEmailAddressId) ??
      u.emailAddresses?.[0];

    return NextResponse.json({
      ok: true,
      userId: targetUserId,
      email: primary?.emailAddress ?? null
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
