import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireRole, isPartner } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getPartnerSchedulingContext } from '@/features/case-scheduling/lib/get-partner-scheduling-context';
import { exchangeMicrosoftCode } from '@/features/calendar-sync/lib/microsoft-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_REDIRECT = '/dashboard/partner-profile/calendar';

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const code = reqUrl.searchParams.get('code');
  const state = reqUrl.searchParams.get('state');
  const error = reqUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`${BASE_REDIRECT}?error=microsoft_denied`, reqUrl.origin)
    );
  }

  try {
    const cookieStore = await cookies();
    const savedState = cookieStore.get('calendar_oauth_state')?.value;
    cookieStore.delete('calendar_oauth_state');

    if (!state || !savedState || state !== savedState) {
      return NextResponse.redirect(
        new URL(`${BASE_REDIRECT}?error=state_mismatch`, reqUrl.origin)
      );
    }
    if (!code) {
      return NextResponse.redirect(
        new URL(`${BASE_REDIRECT}?error=no_code`, reqUrl.origin)
      );
    }

    const guard = await requireRole();
    if (!guard.ok || !isPartner(guard.role)) {
      return NextResponse.redirect(
        new URL(`${BASE_REDIRECT}?error=unauthorized`, reqUrl.origin)
      );
    }

    const ctx = await getPartnerSchedulingContext({
      clerkUserId: guard.userId!,
      role: guard.role as 'GUTACHTER' | 'ANWALT'
    });
    if (!ctx) {
      return NextResponse.redirect(
        new URL(`${BASE_REDIRECT}?error=no_profile`, reqUrl.origin)
      );
    }

    const tokens = await exchangeMicrosoftCode(code);

    await prisma.partnerCalendarConnection.upsert({
      where: {
        partnerId_provider: { partnerId: ctx.partnerId, provider: 'MICROSOFT' }
      },
      create: {
        partnerId: ctx.partnerId,
        provider: 'MICROSOFT',
        accountEmail: tokens.email || null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        isActive: true
      },
      update: {
        accountEmail: tokens.email || null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        isActive: true,
        lastSyncedAt: null
      }
    });

    return NextResponse.redirect(
      new URL(`${BASE_REDIRECT}?connected=microsoft`, reqUrl.origin)
    );
  } catch (e) {
    console.error('[calendar/microsoft/callback]', e);
    return NextResponse.redirect(
      new URL(`${BASE_REDIRECT}?error=microsoft_failed`, reqUrl.origin)
    );
  }
}
