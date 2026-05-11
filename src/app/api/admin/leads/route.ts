import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/rbac';
import { LeadStatus } from '@prisma/client';

export const runtime = 'nodejs';

type Body = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function makeLeadName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
        },
        { status: guard.status }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const email = clean(body.email).toLowerCase();
    const phone = clean(body.phone);
    const street = clean(body.street);
    const houseNumber = clean(body.houseNumber);
    const zipCode = clean(body.zipCode);
    const city = clean(body.city);

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !street ||
      !houseNumber ||
      !zipCode ||
      !city
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'firstName,lastName,email,phone,street,houseNumber,zipCode,city required'
        },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name: makeLeadName(firstName, lastName),
        firstName,
        lastName,
        email,
        phone,
        street,
        houseNumber,
        zipCode,
        city,
        region: city,
        source: 'dashboard-admin',
        status: LeadStatus.NEW
      }
    });

    return NextResponse.json({ ok: true, lead });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
