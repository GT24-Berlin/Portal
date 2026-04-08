import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const runtime = 'nodejs';

function clean(v: any) {
  return String(v ?? '').trim();
}

function normEmail(v: any) {
  return clean(v).toLowerCase();
}

function hashOtp(otp: string) {
  const secret = process.env.OTP_SECRET || 'dev-secret-change-me';
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

function setCaseCookie(res: NextResponse, token: string) {
  // 7 Tage gültig
  res.cookies.set(`case_access_${token}`, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function POST(
  req: Request,
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

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      code?: string;
    };
    const email = normEmail(body.email);
    const code = clean(body.code);

    if (!email || !code) {
      return NextResponse.json(
        { ok: false, error: 'email and code required' },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: 'invalid code format' },
        { status: 400 }
      );
    }

    const c = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        customer: {
          select: {
            id: true,
            email: true,
            otpCodeHash: true,
            otpExpiresAt: true,
            otpVerifiedAt: true,
            otpAttempts: true
          }
        }
      }
    });

    if (!c)
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    if (!c.customer?.id)
      return NextResponse.json(
        { ok: false, error: 'customer not registered' },
        { status: 409 }
      );

    if (normEmail(c.customer.email) !== email) {
      return NextResponse.json(
        { ok: false, error: 'email mismatch' },
        { status: 403 }
      );
    }

    // Already verified -> ok + cookie erneut setzen (idempotent)
    if (c.customer.otpVerifiedAt) {
      const res = NextResponse.json({ ok: true, verified: true });
      setCaseCookie(res, token);
      return res;
    }

    // Missing OTP
    if (!c.customer.otpCodeHash || !c.customer.otpExpiresAt) {
      return NextResponse.json(
        { ok: false, error: 'no active otp' },
        { status: 409 }
      );
    }

    const now = new Date();

    // Expired
    if (new Date(c.customer.otpExpiresAt).getTime() <= now.getTime()) {
      return NextResponse.json(
        { ok: false, error: 'otp expired' },
        { status: 410 }
      );
    }

    // Rate limit
    const attempts = Number(c.customer.otpAttempts ?? 0);
    if (attempts >= 5) {
      return NextResponse.json(
        { ok: false, error: 'too many attempts' },
        { status: 429 }
      );
    }

    // Compare hash
    const incomingHash = hashOtp(code);
    if (incomingHash !== c.customer.otpCodeHash) {
      await prisma.caseCustomer.update({
        where: { id: c.customer.id },
        data: { otpAttempts: attempts + 1 }
      });
      return NextResponse.json(
        { ok: false, error: 'invalid code' },
        { status: 401 }
      );
    }

    // Verified -> set flag and clear code
    await prisma.caseCustomer.update({
      where: { id: c.customer.id },
      data: {
        otpVerifiedAt: now,
        otpCodeHash: null,
        otpExpiresAt: null,
        otpAttempts: 0
      }
    });

    const res = NextResponse.json({ ok: true, verified: true });
    setCaseCookie(res, token);
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
