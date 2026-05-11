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

// mappt API-Fehlertext auf kurze error-codes
function mapSendError(msg: string) {
  const m = String(msg || '').toLowerCase();

  if (m.includes('email required')) return 'email_required';
  if (m.includes('email mismatch')) return 'email_mismatch';
  if (m.includes('customer not registered')) return 'customer_not_registered';
  if (m.includes('case not found')) return 'case_not_found';
  if (m.includes('token missing')) return 'token_missing';
  if (m.includes('otp_recently_sent')) return 'otp_recently_sent';
  if (m.includes('recently sent')) return 'otp_recently_sent';

  return 'send_failed';
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const back = new URL(`/case/${token}/verify`, req.url);

  try {
    const form = await req.formData();
    const email = normEmail(clean(form.get('email')));

    const res = await fetch(new URL(`/api/case/${token}/otp/send`, req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store'
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      back.searchParams.set('sent', '1');
      back.searchParams.delete('error');
      return NextResponse.redirect(back, { status: 303 });
    }

    back.searchParams.set('error', mapSendError(String(data?.error ?? '')));
    return NextResponse.redirect(back, { status: 303 });
  } catch {
    back.searchParams.set('error', 'send_failed');
    return NextResponse.redirect(back, { status: 303 });
  }
}
