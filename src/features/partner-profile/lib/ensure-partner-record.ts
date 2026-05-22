import { prisma } from '@/lib/prisma';

type PartnerRole = 'GUTACHTER' | 'ANWALT';

function clean(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function derivePartnerName(input: {
  companyName: string;
  contactPerson: string;
  email: string;
  role: PartnerRole;
}) {
  return (
    clean(input.companyName) ||
    clean(input.contactPerson) ||
    clean(input.email) ||
    (input.role === 'GUTACHTER' ? 'Gutachter' : 'Anwalt')
  );
}

export async function ensurePartnerRecordForProfile(input: {
  profileId: string;
  partnerId: string | null;
  role: PartnerRole;
  companyName: string;
  contactPerson: string;
  email: string;
  region: string;
}) {
  if (input.partnerId) {
    return input.partnerId;
  }

  const partnerName = derivePartnerName({
    companyName: input.companyName,
    contactPerson: input.contactPerson,
    email: input.email,
    role: input.role
  });

  const normalizedEmail = clean(input.email);

  const existingByEmail = normalizedEmail
    ? await prisma.partner.findFirst({
        where: {
          type: input.role,
          email: normalizedEmail
        },
        select: { id: true }
      })
    : null;

  const existingByName =
    existingByEmail == null
      ? await prisma.partner.findFirst({
          where: {
            type: input.role,
            name: partnerName
          },
          select: { id: true }
        })
      : null;

  const partner =
    existingByEmail ??
    existingByName ??
    (await prisma.partner.create({
      data: {
        type: input.role,
        name: partnerName,
        region: clean(input.region) || null,
        email: normalizedEmail || null
      },
      select: { id: true }
    }));

  await prisma.partnerProfile.update({
    where: {
      id: input.profileId
    },
    data: {
      partnerId: partner.id
    }
  });

  return partner.id;
}
