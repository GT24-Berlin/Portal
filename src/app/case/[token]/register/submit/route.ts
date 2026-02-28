import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function clean(s: FormDataEntryValue | null) {
  return String(s ?? '').trim();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token)
    return NextResponse.json(
      { ok: false, error: 'Missing token' },
      { status: 400 }
    );

  const form = await req.formData();

  const firstName = clean(form.get('firstName'));
  const lastName = clean(form.get('lastName'));
  const email = clean(form.get('email'));
  const phone = clean(form.get('phone'));

  if (!firstName || !lastName || !email || !phone) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const found = await prisma.case.findUnique({
    where: { token },
    select: { id: true, token: true, customer: { select: { id: true } } }
  });

  if (!found)
    return NextResponse.json(
      { ok: false, error: 'Case not found' },
      { status: 404 }
    );

  // Idempotent: wenn customer schon existiert → einfach weiter
  if (found.customer) {
    return NextResponse.redirect(new URL(`/case/${token}`, req.url));
  }

  await prisma.caseCustomer.create({
    data: {
      caseId: found.id,
      firstName,
      lastName,
      email,
      phone
    },
    select: { id: true }
  });

  return NextResponse.redirect(new URL(`/case/${token}`, req.url));
}
