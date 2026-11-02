import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  verifyCaseAccessGrant,
  mintCaseAccessGrant,
  caseAccessCookieName
} from '@/lib/case-access-grant';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'token missing' },
        { status: 400 }
      );
    }

    const c = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        customer: { select: { id: true, otpVerifiedAt: true } }
      }
    });

    if (!c)
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );

    // Read existing signed grant from cookie
    const jar = await cookies();
    const existingGrant = jar.get(caseAccessCookieName(token))?.value ?? '';

    if (!existingGrant) {
      return NextResponse.json(
        { ok: false, error: 'no grant' },
        { status: 401 }
      );
    }

    // SEC-003: Verify existing grant — token + otpVerifiedAt alone must NOT create a session
    const verification = verifyCaseAccessGrant(existingGrant, c.id);
    if (!verification.ok) {
      return NextResponse.json(
        { ok: false, error: verification.reason },
        { status: 401 }
      );
    }

    // Also verify current customer still exists and otpVerifiedAt is set
    if (!c.customer?.id || !c.customer.otpVerifiedAt) {
      return NextResponse.json(
        { ok: false, error: 'not verified' },
        { status: 403 }
      );
    }

    // Verify grant customerId matches the actual customer
    if (verification.customerId !== c.customer.id) {
      return NextResponse.json(
        { ok: false, error: 'customer_mismatch' },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ ok: true });
    const freshGrant = mintCaseAccessGrant(c.id, c.customer.id);
    res.cookies.set(caseAccessCookieName(token), freshGrant, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
