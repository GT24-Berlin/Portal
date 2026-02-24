import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // optional: nur eingeloggte User dürfen testen
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );

  const body = (await req.json().catch(() => ({}))) as { to?: string };
  const to = (body.to ?? '').trim();
  if (!to)
    return NextResponse.json(
      { ok: false, error: 'Missing to' },
      { status: 400 }
    );

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = String(process.env.SMTP_SECURE ?? 'true') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM ?? user;

  if (!host || !user || !pass) {
    return NextResponse.json(
      { ok: false, error: 'Missing SMTP env (SMTP_HOST/SMTP_USER/SMTP_PASS)' },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'GT24 SMTP Test',
      text: 'SMTP Test OK ✅',
      html: '<b>SMTP Test OK ✅</b>'
    });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
