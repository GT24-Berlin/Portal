import nodemailer from 'nodemailer';

// Mail transport selection:
// - LOCAL dev with Mailpit: SMTP_HOST=localhost, SMTP_PORT=1025
// - NEXT (Vercel): SMTP_HOST unset → null transport (no delivery, logs only)
// - PRODUCTION: All-Inkl SMTP — FORBIDDEN in NEXT (env-guard rejects it)

function createTransport() {
  const host = process.env.SMTP_HOST;

  if (!host) {
    // Null transport: logs mail as JSON, never delivers
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!
    }
  });
}

export const transporter = createTransport();

const REAL_DOMAIN = '@gutachtery24.de';

export async function sendMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  // SC-10: Never deliver to real GT24 addresses in NEXT
  if (
    process.env.GT24_ENVIRONMENT === 'next' &&
    opts.to.includes(REAL_DOMAIN)
  ) {
    throw new Error(
      `[mailer] Refusing to send to real @gutachtery24.de address in NEXT environment. ` +
        `Use @gt24-test.internal. SC-10.`
    );
  }

  const from =
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    'noreply@gt24-test.internal';

  const result = await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html
  });

  // jsonTransport returns the serialized message — log it in dev/next
  if (!process.env.SMTP_HOST) {
    console.log('[mailer] null-transport (no delivery):', result.message);
  }

  return result;
}
