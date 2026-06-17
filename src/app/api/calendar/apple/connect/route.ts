import { NextResponse } from 'next/server';
import { requireRole, isPartner } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getPartnerSchedulingContext } from '@/features/case-scheduling/lib/get-partner-scheduling-context';
import {
  discoverAppleCalendarHome,
  encryptAppleCredentials
} from '@/features/calendar-sync/lib/apple-caldav';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const appleId = String(body.appleId ?? '').trim();
    const appPassword = String(body.appPassword ?? '').trim();

    if (!appleId || !appPassword) {
      return NextResponse.json(
        { ok: false, error: 'Apple-ID und App-Passwort erforderlich' },
        { status: 400 }
      );
    }

    // Validate credentials and discover calendar home URL
    const calendarHomeUrl = await discoverAppleCalendarHome(
      appleId,
      appPassword
    );
    const encryptedCreds = encryptAppleCredentials(appleId, appPassword);

    await prisma.partnerCalendarConnection.upsert({
      where: {
        partnerId_provider: { partnerId: ctx.partnerId, provider: 'APPLE' }
      },
      create: {
        partnerId: ctx.partnerId,
        provider: 'APPLE',
        accountEmail: appleId,
        accessToken: encryptedCreds,
        calendarId: calendarHomeUrl,
        isActive: true
      },
      update: {
        accountEmail: appleId,
        accessToken: encryptedCreds,
        calendarId: calendarHomeUrl,
        isActive: true,
        lastSyncedAt: null
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('401') || msg.includes('ungültig')) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Zugangsdaten ungültig. Bitte Apple-ID und App-Passwort prüfen.'
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Verbindung fehlgeschlagen: ' + msg },
      { status: 500 }
    );
  }
}
