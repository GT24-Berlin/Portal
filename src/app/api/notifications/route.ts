import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/notifications
 * Neueste Notifications für eingeloggten User
 * Unread = readAt is null
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rows = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        createdAt: true,
        readAt: true,
        caseId: true,
        role: true
      }
    });

    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Body: { ids: [...] } oder { all: true }
 */
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      ids?: string[];
      all?: boolean;
    };
    const now = new Date();

    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: now }
      });
      return NextResponse.json({ ok: true });
    }

    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'ids required' },
        { status: 400 }
      );
    }

    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { readAt: now }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
