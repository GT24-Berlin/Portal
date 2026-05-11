import { NextResponse } from 'next/server';
import { requireRole, isPartner } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getPartnerProfile } from '@/features/partner-profile/lib/get-partner-profile';

type Body = {
  companyName?: string;
  legalForm?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  region?: string;
};

function clean(v: unknown) {
  return String(v ?? '').trim();
}

export const runtime = 'nodejs';

export async function GET() {
  try {
    const guard = await requireRole();

    if (!guard.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
        },
        { status: guard.status }
      );
    }

    if (!isPartner(guard.role)) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const profile = await getPartnerProfile({
      clerkUserId: guard.userId!,
      role: guard.role as 'GUTACHTER' | 'ANWALT'
    });

    return NextResponse.json({
      ok: true,
      profile
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const guard = await requireRole();

    if (!guard.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
        },
        { status: guard.status }
      );
    }

    if (!isPartner(guard.role)) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    const row = await prisma.partnerProfile.upsert({
      where: {
        clerkUserId: guard.userId!
      },
      update: {
        role: guard.role as any,
        companyName: clean(body.companyName) || null,
        legalForm: clean(body.legalForm) || null,
        contactPerson: clean(body.contactPerson) || null,
        email: clean(body.email) || null,
        phone: clean(body.phone) || null,
        website: clean(body.website) || null,
        logoUrl: clean(body.logoUrl) || null,
        street: clean(body.street) || null,
        houseNumber: clean(body.houseNumber) || null,
        zipCode: clean(body.zipCode) || null,
        city: clean(body.city) || null,
        country: clean(body.country) || null,
        region: clean(body.region) || null
      },
      create: {
        clerkUserId: guard.userId!,
        role: guard.role as any,
        companyName: clean(body.companyName) || null,
        legalForm: clean(body.legalForm) || null,
        contactPerson: clean(body.contactPerson) || null,
        email: clean(body.email) || null,
        phone: clean(body.phone) || null,
        website: clean(body.website) || null,
        logoUrl: clean(body.logoUrl) || null,
        street: clean(body.street) || null,
        houseNumber: clean(body.houseNumber) || null,
        zipCode: clean(body.zipCode) || null,
        city: clean(body.city) || null,
        country: clean(body.country) || null,
        region: clean(body.region) || null
      }
    });

    return NextResponse.json({
      ok: true,
      profileId: row.id
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
