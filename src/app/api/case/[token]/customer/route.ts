import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function normEmail(v: string) {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'token missing' },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };

    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const email = normEmail(body.email ?? '');
    const phone = String(body.phone ?? '').trim();

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { ok: false, error: 'firstName,lastName,email,phone required' },
        { status: 400 }
      );
    }

    const c = await prisma.case.findUnique({
      where: { token },
      select: { id: true, caseNumber: true }
    });

    if (!c) {
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    }

    const customer = await prisma.caseCustomer.upsert({
      where: { caseId: c.id },
      create: {
        caseId: c.id,
        firstName,
        lastName,
        email,
        phone
      },
      update: {
        firstName,
        lastName,
        email,
        phone
      },
      select: { id: true, caseId: true }
    });

    return NextResponse.json({ ok: true, customer });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
