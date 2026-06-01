import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import {
  getCaseOtpByCaseIdAndEmail,
  hasOtpAttemptsRemaining,
  incrementCaseOtpAttempts,
  isOtpCodeMatching,
  isOtpExpired,
  normalizeOtpEmail
} from '@/lib/case-otp';
import { logOperationalEvent } from '@/lib/ops-log';

export const runtime = 'nodejs';

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

function clean(v: unknown) {
  return String(v ?? '').trim();
}

function setCaseCookie(res: NextResponse, token: string) {
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
      await logOperationalEvent({
        caseId: null,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP verify denied: token missing',
        metadata: {}
      });

      return NextResponse.json(
        { ok: false, error: 'token missing' },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      code?: string;
    };

    const email = normalizeOtpEmail(body.email ?? '');
    const code = clean(body.code);

    if (!email || !code) {
      await logOperationalEvent({
        caseId: null,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP verify denied: email and code required',
        metadata: {}
      });

      return NextResponse.json(
        { ok: false, error: 'email and code required' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      await logOperationalEvent({
        caseId: null,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP verify denied: invalid code format',
        metadata: { email }
      });

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
            otpVerifiedAt: true
          }
        }
      }
    });

    if (!c) {
      await logOperationalEvent({
        caseId: null,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP verify denied: case not found',
        metadata: {
          token,
          email
        }
      });

      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    }

    if (!c.customer?.id) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP verify denied: customer not registered',
        metadata: {
          token,
          email
        }
      });

      return NextResponse.json(
        { ok: false, error: 'customer not registered' },
        { status: 409 }
      );
    }

    const customerId = c.customer.id;

    if (normalizeOtpEmail(c.customer.email) !== email) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP verify denied: email mismatch',
        metadata: {
          token,
          email
        }
      });

      return NextResponse.json(
        { ok: false, error: 'email mismatch' },
        { status: 403 }
      );
    }

    if (c.customer.otpVerifiedAt) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'ALREADY_DONE',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP verify skipped: already verified',
        metadata: {
          token,
          email
        }
      });

      const res = NextResponse.json(
        { ok: true, alreadyVerified: true },
        { status: 200 }
      );
      setCaseCookie(res, token);
      return res;
    }

    const otpState = await getCaseOtpByCaseIdAndEmail({
      caseId: c.id,
      email
    });

    if (!otpState || !otpState.codeHash || !otpState.expiresAt) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP verify denied: no active otp',
        metadata: {
          token,
          email
        }
      });

      return NextResponse.json(
        { ok: false, error: 'no active otp' },
        { status: 400 }
      );
    }

    if (otpState.verifiedAt) {
      await prisma.caseCustomer.update({
        where: { id: customerId },
        data: { otpVerifiedAt: otpState.verifiedAt }
      });

      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'ALREADY_DONE',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP verify skipped: otp challenge already verified',
        metadata: {
          token,
          email
        }
      });

      const res = NextResponse.json(
        { ok: true, alreadyVerified: true },
        { status: 200 }
      );
      setCaseCookie(res, token);
      return res;
    }

    if (isOtpExpired(new Date(otpState.expiresAt), new Date())) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'EXPIRED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP verify failed: otp expired',
        metadata: {
          token,
          email
        }
      });

      return NextResponse.json(
        { ok: false, error: 'otp expired' },
        { status: 400 }
      );
    }

    if (!hasOtpAttemptsRemaining(Number(otpState.attempts ?? 0))) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP verify denied: too many attempts',
        metadata: {
          token,
          email,
          attempts: otpState.attempts
        }
      });

      return NextResponse.json(
        { ok: false, error: 'too many attempts' },
        { status: 429 }
      );
    }

    const isMatching = isOtpCodeMatching({
      incomingCode: code,
      expectedCodeHash: otpState.codeHash
    });

    if (!isMatching) {
      await incrementCaseOtpAttempts({
        caseId: c.id,
        email
      });

      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'VERIFY',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP verify denied: invalid otp',
        metadata: {
          token,
          email,
          attemptsBefore: otpState.attempts
        }
      });

      return NextResponse.json(
        { ok: false, error: 'invalid otp' },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.caseCustomer.update({
        where: { id: customerId },
        data: {
          otpVerifiedAt: now
        }
      });

      await tx.caseCustomerOtp.update({
        where: {
          caseId_email: {
            caseId: c.id,
            email
          }
        },
        data: {
          verifiedAt: now,
          codeHash: '',
          expiresAt: new Date(0),
          attempts: 0
        }
      });
    });

    await logOperationalEvent({
      caseId: c.id,
      domain: 'OTP',
      action: 'VERIFY',
      result: 'SUCCESS',
      actorType: 'CUSTOMER',
      actorId: c.customer.id,
      message: 'OTP verify successful',
      metadata: {
        token,
        email
      }
    });

    const res = NextResponse.json({ ok: true }, { status: 200 });
    setCaseCookie(res, token);
    return res;
  } catch (e: any) {
    await logOperationalEvent({
      caseId: null,
      domain: 'OTP',
      action: 'VERIFY',
      result: 'FAILED',
      actorType: 'CUSTOMER',
      actorId: null,
      message: 'OTP verify failed',
      metadata: {
        error: String(e?.message ?? e)
      }
    });

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
