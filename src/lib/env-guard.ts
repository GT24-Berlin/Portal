import 'server-only';

// GT24 Environment Safety Guard
// Fail-closed: refuses to start if production resources are detected in NEXT.
// Called from instrumentation.ts at startup.

const PRODUCTION_APP_DOMAIN = 'portal.gutachtery24.de';
const PRODUCTION_STORAGE_BUCKET = 'gt24-case-files';
const PRODUCTION_SMTP_HOSTS = ['smtp.all-inkl.com', 'server.all-inkl.com'];

export function assertNextEnvironment(): void {
  const gt24Env = process.env.GT24_ENVIRONMENT;

  if (gt24Env !== 'next') {
    throw new Error(
      `[env-guard] GT24_ENVIRONMENT must be 'next'. ` +
        `Got: '${gt24Env ?? '(unset)'}'. ` +
        `Refusing to start without explicit NEXT environment identity. SC-06.`
    );
  }

  // SC-04: Reject production app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (appUrl.includes(PRODUCTION_APP_DOMAIN)) {
    throw new Error(
      `[env-guard] NEXT_PUBLIC_APP_URL contains production domain '${PRODUCTION_APP_DOMAIN}'. ` +
        `STOP SC-04.`
    );
  }

  // SC-11: Reject production storage bucket
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? '';
  if (bucket === PRODUCTION_STORAGE_BUCKET) {
    throw new Error(
      `[env-guard] SUPABASE_STORAGE_BUCKET is set to production bucket ` +
        `'${PRODUCTION_STORAGE_BUCKET}'. STOP SC-11.`
    );
  }

  // SC-05: Reject production SMTP
  const smtpHost = (process.env.SMTP_HOST ?? '').toLowerCase();
  const productionSmtp = PRODUCTION_SMTP_HOSTS.find((h) =>
    smtpHost.includes(h)
  );
  if (productionSmtp) {
    throw new Error(
      `[env-guard] SMTP_HOST '${process.env.SMTP_HOST}' matches production All-Inkl server. ` +
        `STOP SC-05.`
    );
  }

  // SC-02: Warn on production Clerk key (live_ prefix)
  const clerkPublishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  if (clerkPublishable.startsWith('pk_live_')) {
    throw new Error(
      `[env-guard] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY starts with 'pk_live_' — ` +
        `this is a Production Clerk key. NEXT requires a Development key (pk_test_). STOP SC-02.`
    );
  }

  const clerkSecret = process.env.CLERK_SECRET_KEY ?? '';
  if (clerkSecret.startsWith('sk_live_')) {
    throw new Error(
      `[env-guard] CLERK_SECRET_KEY starts with 'sk_live_' — ` +
        `this is a Production Clerk key. NEXT requires a Development key (sk_test_). STOP SC-02.`
    );
  }

  // SEC-005: Reject absent or insecure OTP_SECRET
  const otpSecret = process.env.OTP_SECRET;
  if (!otpSecret || otpSecret === 'dev-secret-change-me') {
    throw new Error(
      `[env-guard] OTP_SECRET is ${otpSecret ? 'set to the insecure fallback value' : 'not set'}. ` +
        `Generate a secure value: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" ` +
        `and set it as OTP_SECRET in Vercel NEXT. SEC-005.`
    );
  }

  // SC-10: Reject real @gutachtery24.de email addresses in mail config
  const mailFrom = process.env.MAIL_FROM ?? '';
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL ?? '';
  const realDomain = '@gutachtery24.de';
  if (mailFrom.includes(realDomain) || adminEmail.includes(realDomain)) {
    throw new Error(
      `[env-guard] Mail configuration contains real @gutachtery24.de address. ` +
        `Use @gt24-test.internal in NEXT. STOP SC-10.`
    );
  }

  // Log safe environment identifiers (no secrets)
  const safeLog = {
    GT24_ENVIRONMENT: gt24Env,
    SUPABASE_STORAGE_BUCKET: bucket || '(unset)',
    SMTP_HOST: smtpHost || '(unset)',
    APP_URL: appUrl || '(unset)',
    CLERK_KEY_TYPE: clerkPublishable
      ? clerkPublishable.startsWith('pk_test_')
        ? 'development'
        : 'UNKNOWN'
      : '(unset)',
    OTP_SECRET: 'present',
    SENTRY_DISABLED: process.env.NEXT_PUBLIC_SENTRY_DISABLED ?? '(unset)'
  };

  console.log('[env-guard] NEXT environment verified:', safeLog);
}
