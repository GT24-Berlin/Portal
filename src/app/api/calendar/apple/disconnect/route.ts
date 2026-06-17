import { NextResponse } from 'next/server';
import { requireRole, isPartner } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getPartnerSchedulingContext } from '@/features/case-scheduling/lib/get-partner-scheduling-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
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

    await prisma.partnerCalendarConnection.deleteMany({
      where: { partnerId: ctx.partnerId, provider: 'APPLE' }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
