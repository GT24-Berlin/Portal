import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token || token !== process.env.COFORM_WEBHOOK_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const phone = clean(body.phone);
  const street = clean(body.street);
  const houseNumber = clean(body.houseNumber);
  const zipCode = clean(body.zipCode);
  const city = clean(body.city);
  const email = clean(body.email).toLowerCase(); // optional

  if (
    !firstName ||
    !lastName ||
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
          'Pflichtfelder fehlen: firstName, lastName, phone, street, houseNumber, zipCode, city'
      },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.create({
    data: {
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email: email || null,
      phone,
      street,
      houseNumber,
      zipCode,
      city,
      region: city,
      source: 'coform',
      status: 'NEW'
    }
  });

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
}
