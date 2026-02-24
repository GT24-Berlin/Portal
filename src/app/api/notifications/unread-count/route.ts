import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );

  const count = await prisma.notification.count({
    where: { userId, readAt: null }
  });

  return NextResponse.json({ ok: true, count });
}
