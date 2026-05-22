import { prisma } from '@/lib/prisma';
import { emptyPartnerProfile, type PartnerProfileDto } from '../types';
import { ensurePartnerRecordForProfile } from './ensure-partner-record';

export async function getPartnerProfile(input: {
  clerkUserId: string;
  role: 'GUTACHTER' | 'ANWALT';
}): Promise<PartnerProfileDto> {
  try {
    const row = await prisma.partnerProfile.findUnique({
      where: {
        clerkUserId: input.clerkUserId
      },
      select: {
        id: true,
        clerkUserId: true,
        role: true,
        partnerId: true,
        companyName: true,
        legalForm: true,
        contactPerson: true,
        email: true,
        phone: true,
        website: true,
        logoUrl: true,
        street: true,
        houseNumber: true,
        zipCode: true,
        city: true,
        country: true,
        region: true
      }
    });

    if (!row) {
      return emptyPartnerProfile(input.role, input.clerkUserId);
    }

    const partnerId = await ensurePartnerRecordForProfile({
      profileId: row.id,
      partnerId: row.partnerId ?? null,
      role: input.role,
      companyName: row.companyName ?? '',
      contactPerson: row.contactPerson ?? '',
      email: row.email ?? '',
      region: row.region ?? ''
    });

    return {
      clerkUserId: row.clerkUserId,
      role: row.role as 'GUTACHTER' | 'ANWALT',
      partnerId,
      companyName: row.companyName ?? '',
      legalForm: row.legalForm ?? '',
      contactPerson: row.contactPerson ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      website: row.website ?? '',
      logoUrl: row.logoUrl ?? '',
      street: row.street ?? '',
      houseNumber: row.houseNumber ?? '',
      zipCode: row.zipCode ?? '',
      city: row.city ?? '',
      country: row.country ?? '',
      region: row.region ?? ''
    };
  } catch (e: any) {
    if (e?.code === 'P1001') {
      console.error('Partner profile degraded (DB unreachable):', e);
      return emptyPartnerProfile(input.role, input.clerkUserId);
    }

    throw e;
  }
}
