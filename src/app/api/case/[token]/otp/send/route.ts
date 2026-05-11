import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';
import {
  caseOtpConfig,
  createOrReplaceCaseOtpChallenge,
  generateOtpCode,
  getCaseOtpByCaseIdAndEmail,
  isOtpResendAllowed,
  normalizeOtpEmail
} from '@/lib/case-otp';
import { logOperationalEvent } from '@/lib/ops-log';

export const runtime = 'nodejs';

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
        action: 'SEND',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP send denied: token missing',
        metadata: {}
      });

      return NextResponse.json(
        { ok: false, error: 'token missing' },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = normalizeOtpEmail(body.email ?? '');

    if (!email) {
      await logOperationalEvent({
        caseId: null,
        domain: 'OTP',
        action: 'SEND',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP send denied: email required',
        metadata: {}
      });

      return NextResponse.json(
        { ok: false, error: 'email required' },
        { status: 400 }
      );
    }

    const c = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        caseNumber: true,
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
        action: 'SEND',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP send denied: case not found',
        metadata: {
          token
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
        action: 'SEND',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'OTP send denied: customer not registered',
        metadata: {
          token
        }
      });

      return NextResponse.json(
        { ok: false, error: 'customer not registered' },
        { status: 409 }
      );
    }

    if (normalizeOtpEmail(c.customer.email) !== email) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'SEND',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP send denied: email mismatch',
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
        action: 'SEND',
        result: 'ALREADY_DONE',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP send skipped: already verified',
        metadata: {
          token,
          email
        }
      });

      return NextResponse.json(
        { ok: true, alreadyVerified: true },
        { status: 200 }
      );
    }

    const existingOtp = await getCaseOtpByCaseIdAndEmail({
      caseId: c.id,
      email
    });

    if (
      existingOtp &&
      !isOtpResendAllowed(existingOtp.lastSentAt ?? null, new Date())
    ) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'OTP',
        action: 'SEND',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'OTP send denied: resend cooldown active',
        metadata: {
          token,
          email,
          lastSentAt: existingOtp.lastSentAt
        }
      });

      return NextResponse.json(
        { ok: false, error: 'otp_recently_sent' },
        { status: 429 }
      );
    }

    const otp = generateOtpCode();

    await createOrReplaceCaseOtpChallenge({
      caseId: c.id,
      email,
      code: otp
    });

    await logOperationalEvent({
      caseId: c.id,
      domain: 'OTP',
      action: 'SEND',
      result: 'SUCCESS',
      actorType: 'CUSTOMER',
      actorId: c.customer.id,
      message: 'OTP send successful',
      metadata: {
        token,
        email
      }
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const label = c.caseNumber ?? c.id.slice(0, 8);

    await sendMail({
      to: email,
      subject: `Gutachtery24 – Sicherheitscode für Fall ${label}`,
      text:
        `Dein Sicherheitscode lautet: ${otp}\n\n` +
        `Er ist ${caseOtpConfig.otpTtlMinutes} Minuten gültig.\n\n` +
        `Fall öffnen: ${appUrl}/case/${token}\n`,
      html: `
        <p>Dein Sicherheitscode lautet:</p>
        <p style="font-size:24px; font-weight:700; letter-spacing:2px">${otp}</p>
        <p>Gültig für <b>${caseOtpConfig.otpTtlMinutes} Minuten</b>.</p>
        <p><a href="${appUrl}/case/${token}">Fall öffnen</a></p>
      `
    });

    return NextResponse.json({
      ok: true,
      sent: true,
      cooldownSeconds: caseOtpConfig.otpResendCooldownSeconds
    });
  } catch (e: any) {
    await logOperationalEvent({
      caseId: null,
      domain: 'OTP',
      action: 'SEND',
      result: 'FAILED',
      actorType: 'CUSTOMER',
      actorId: null,
      message: 'OTP send failed',
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
