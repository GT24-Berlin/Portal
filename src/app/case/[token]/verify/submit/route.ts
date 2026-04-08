import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function clean(v: FormDataEntryValue | null) {
  return String(v ?? '').trim();
}

function normEmail(v: string) {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token)
    return NextResponse.redirect(new URL(`/case`, req.url), { status: 303 });

  const form = await req.formData();
  const email = normEmail(clean(form.get('email')));
  const code = clean(form.get('code'));

  const back = new URL(`/case/${token}/verify`, req.url);

  if (!email) {
    back.searchParams.set('error', 'email_required');
    return NextResponse.redirect(back, { status: 303 });
  }
  if (!/^\d{6}$/.test(code)) {
    back.searchParams.set('error', 'code_invalid_format');
    return NextResponse.redirect(back, { status: 303 });
  }

  try {
    const apiUrl = new URL(`/api/case/${token}/otp/verify`, req.url);

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
      cache: 'no-store'
    });

    const data = await res.json().catch(() => null);

    // Erfolg: Cookie MUSS hier gesetzt werden (fetch forwarded kein Set-Cookie an Browser)
    if (res.ok && data?.ok) {
      const out = NextResponse.redirect(new URL(`/case/${token}`, req.url), {
        status: 303
      });

      out.cookies.set(`case_access_${token}`, '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      });

      return out;
    }

    const msg = String(data?.error ?? '');

    const map: Record<string, string> = {
      token_missing: 'token_missing',
      'token missing': 'token_missing',

      case_not_found: 'case_not_found',
      'case not found': 'case_not_found',

      customer_not_registered: 'not_registered',
      'customer not registered': 'not_registered',

      email_mismatch: 'email_mismatch',
      'email mismatch': 'email_mismatch',

      no_active_otp: 'no_active_otp',
      'no active otp': 'no_active_otp',

      otp_expired: 'otp_expired',
      'otp expired': 'otp_expired',

      too_many_attempts: 'too_many_attempts',
      'too many attempts': 'too_many_attempts',

      invalid_code: 'invalid_code',
      'invalid code': 'invalid_code',

      invalid_code_format: 'code_invalid_format',
      'invalid code format': 'code_invalid_format'
    };

    let key = 'verify_failed';

    // exakter match
    if (map[msg]) key = map[msg];

    // heuristik
    if (key === 'verify_failed') {
      const m = msg.toLowerCase();
      if (m.includes('mismatch')) key = 'email_mismatch';
      else if (m.includes('expired')) key = 'otp_expired';
      else if (m.includes('attempt')) key = 'too_many_attempts';
      else if (m.includes('invalid')) key = 'invalid_code';
      else if (m.includes('active otp')) key = 'no_active_otp';
    }

    back.searchParams.set('error', key);
    return NextResponse.redirect(back, { status: 303 });
  } catch {
    back.searchParams.set('error', 'verify_failed');
    return NextResponse.redirect(back, { status: 303 });
  }
}
