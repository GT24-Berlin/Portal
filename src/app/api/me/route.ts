import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? '');

  return NextResponse.json({
    ok: true,
    userId,
    role,
    publicMetadata: user?.publicMetadata ?? {}
  });
}
