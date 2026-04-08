import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendMail } from '@/lib/mailer';

export const runtime = 'nodejs';

function clean(v: any) {
  return String(v ?? '').trim();
}
function normEmail(v: any) {
  return clean(v).toLowerCase();
}
function genOtp() {
  // 6-stellig, führende Nullen erlaubt
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}
function hashOtp(otp: string) {
  const secret = process.env.OTP_SECRET || 'dev-secret-change-me';
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token)
      return NextResponse.json(
        { ok: false, error: 'token missing' },
        { status: 400 }
      );

    const body = (await req.json().catch(() => ({}))) as { email?: string };

    const email = normEmail(body.email);
    if (!email)
      return NextResponse.json(
        { ok: false, error: 'email required' },
        { status: 400 }
      );

    // Case + Customer laden
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
            otpLastSentAt: true,
            otpVerifiedAt: true
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

    // Email muss zur Registrierung passen
    if (normEmail(c.customer.email) !== email) {
      return NextResponse.json(
        { ok: false, error: 'email mismatch' },
        { status: 403 }
      );
    }

    // Rate limit: max alle 30s
    const now = new Date();
    const last = c.customer.otpLastSentAt
      ? new Date(c.customer.otpLastSentAt)
      : null;
    if (last && now.getTime() - last.getTime() < 30_000) {
      return NextResponse.json(
        { ok: false, error: 'too many requests' },
        { status: 429 }
      );
    }

    const otp = genOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 Minuten

    await prisma.caseCustomer.update({
      where: { id: c.customer.id },
      data: {
        otpCodeHash: otpHash,
        otpExpiresAt: expiresAt,
        otpVerifiedAt: null,
        otpLastSentAt: now,
        otpAttempts: 0
      }
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const label = c.caseNumber ?? c.id.slice(0, 8);

    await sendMail({
      to: email,
      subject: `Gutachtery24 – Sicherheitscode für Fall ${label}`,
      text:
        `Dein Sicherheitscode lautet: ${otp}\n\n` +
        `Er ist 10 Minuten gültig.\n\n` +
        `Fall öffnen: ${appUrl}/case/${token}\n`,
      html: `
        <p>Dein Sicherheitscode lautet:</p>
        <p style="font-size:24px; font-weight:700; letter-spacing:2px">${otp}</p>
        <p>Gültig für <b>10 Minuten</b>.</p>
        <p><a href="${appUrl}/case/${token}">Fall öffnen</a></p>
      `
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
