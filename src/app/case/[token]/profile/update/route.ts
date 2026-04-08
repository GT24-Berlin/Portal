import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  const back = new URL(`/case/${token}/profile`, req.url);

  if (!token) {
    back.searchParams.set('error', 'token_missing');
    return NextResponse.redirect(back, { status: 303 });
  }

  const form = await req.formData();

  const firstName = clean(form.get('firstName'));
  const lastName = clean(form.get('lastName'));
  const phone = clean(form.get('phone'));
  const email = normEmail(clean(form.get('email'))); // readonly, aber zur Sicherheit

  if (!firstName || !lastName || !phone) {
    back.searchParams.set('error', 'missing_fields');
    return NextResponse.redirect(back, { status: 303 });
  }

  const c = await prisma.case.findUnique({
    where: { token },
    select: {
      id: true,
      customer: { select: { id: true, email: true, otpVerifiedAt: true } }
    }
  });

  if (!c) {
    back.searchParams.set('error', 'case_not_found');
    return NextResponse.redirect(back, { status: 303 });
  }

  if (!c.customer?.id) {
    return NextResponse.redirect(new URL(`/case/${token}/register`, req.url), {
      status: 303
    });
  }

  if (!c.customer.otpVerifiedAt) {
    return NextResponse.redirect(new URL(`/case/${token}/verify`, req.url), {
      status: 303
    });
  }

  // E-Mail muss zum Case passen (Schutz gegen fremde Submits)
  if (normEmail(c.customer.email) !== email) {
    back.searchParams.set('error', 'email_mismatch');
    return NextResponse.redirect(back, { status: 303 });
  }

  await prisma.caseCustomer.update({
    where: { id: c.customer.id },
    data: { firstName, lastName, phone }
  });

  back.searchParams.set('saved', '1');
  return NextResponse.redirect(back, { status: 303 });
}
