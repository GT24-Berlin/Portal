import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST!;
const port = Number(process.env.SMTP_PORT || 465);
const secure = String(process.env.SMTP_SECURE ?? 'true') === 'true';

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!
  }
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER!;
  return transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html
  });
}
