import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const count = await prisma.notification.count({
      where: { userId, readAt: null }
    });

    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    // DB temporär nicht erreichbar -> Badge fail-soft
    if (e?.code === 'P1001') {
      console.warn(
        'Notification unread-count degraded: DB unreachable (P1001)'
      );

      return NextResponse.json({
        ok: true,
        count: 0,
        degraded: true
      });
    }

    console.error('Notification unread-count failed:', e);

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
