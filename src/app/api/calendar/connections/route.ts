import { NextResponse } from 'next/server';
import { requireRole, isPartner } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getPartnerSchedulingContext } from '@/features/case-scheduling/lib/get-partner-scheduling-context';
import type { CalendarConnectionRow } from '@/features/calendar-sync/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const guard = await requireRole();
    if (!guard.ok) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (!isPartner(guard.role)) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const ctx = await getPartnerSchedulingContext({
      clerkUserId: guard.userId!,
      role: guard.role as 'GUTACHTER' | 'ANWALT'
    });
    if (!ctx) {
      return NextResponse.json(
        { ok: false, error: 'Partner profile missing' },
        { status: 400 }
      );
    }

    const connections = await prisma.partnerCalendarConnection.findMany({
      where: { partnerId: ctx.partnerId },
      select: {
        id: true,
        provider: true,
        accountEmail: true,
        isActive: true,
        lastSyncedAt: true,
        calendarId: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const rows: CalendarConnectionRow[] = connections.map((c) => ({
      id: c.id,
      provider: c.provider as CalendarConnectionRow['provider'],
      accountEmail: c.accountEmail,
      isActive: c.isActive,
      lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
      calendarId: c.calendarId
    }));

    return NextResponse.json({ ok: true, connections: rows });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
