/**
 * GT24 NEXT — Deterministic Synthetic Seed (v2)
 *
 * All data is synthetic. No real customer information.
 * All emails use @gt24-test.internal domain (SC-10/SC-18).
 * All names are fictional.
 *
 * Run: pnpm exec tsx prisma/seed.ts
 * Requires: GT24 NEXT Supabase database (not production).
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

config({ path: '.env' });
config({ path: '.env.local', override: true });

// SC-11: Refuse if production bucket is configured
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? '';
if (bucket === 'gt24-case-files') {
  throw new Error(
    '[seed] SUPABASE_STORAGE_BUCKET is gt24-case-files (production). Refusing. SC-11.'
  );
}

const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) throw new Error('[seed] DATABASE_URL not set');

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString })),
  log: ['error']
});

// Synthetic Clerk userIds (clearly fake — user_test_ prefix)
const GUTACHTER_1_CLERK_ID = 'user_test_gutachter_001';
const GUTACHTER_2_CLERK_ID = 'user_test_gutachter_002';
const ANWALT_1_CLERK_ID = 'user_test_anwalt_001';

async function main() {
  console.log('[seed] Starting GT24 NEXT synthetic seed v2...');

  // -------------------------------------------------------------------------
  // Partners
  // -------------------------------------------------------------------------

  const partner1 = await prisma.partner.upsert({
    where: { id: 'seed-partner-gutachter-1' },
    update: {},
    create: {
      id: 'seed-partner-gutachter-1',
      name: 'Max Muster',
      type: 'GUTACHTER',
      email: 'max.muster@gt24-test.internal',
      region: 'Berlin'
    }
  });

  const partner2 = await prisma.partner.upsert({
    where: { id: 'seed-partner-gutachter-2' },
    update: {},
    create: {
      id: 'seed-partner-gutachter-2',
      name: 'Anna Beispiel',
      type: 'GUTACHTER',
      email: 'anna.beispiel@gt24-test.internal',
      region: 'Berlin'
    }
  });

  const partner3 = await prisma.partner.upsert({
    where: { id: 'seed-partner-anwalt-1' },
    update: {},
    create: {
      id: 'seed-partner-anwalt-1',
      name: 'Thomas Kanzlei',
      type: 'ANWALT',
      email: 'thomas.kanzlei@gt24-test.internal',
      region: 'Berlin'
    }
  });

  console.log(
    '[seed] Partners created:',
    partner1.id,
    partner2.id,
    partner3.id
  );

  // -------------------------------------------------------------------------
  // PartnerProfiles (clerkUserId is on PartnerProfile, not Partner)
  // -------------------------------------------------------------------------

  await prisma.partnerProfile.upsert({
    where: { clerkUserId: GUTACHTER_1_CLERK_ID },
    update: {},
    create: {
      clerkUserId: GUTACHTER_1_CLERK_ID,
      role: 'GUTACHTER',
      companyName: 'Muster Gutachten GmbH',
      phone: '+49300000001',
      street: 'Musterstraße 1',
      zipCode: '10115',
      city: 'Berlin',
      partnerId: partner1.id
    }
  });

  await prisma.partnerProfile.upsert({
    where: { clerkUserId: GUTACHTER_2_CLERK_ID },
    update: {},
    create: {
      clerkUserId: GUTACHTER_2_CLERK_ID,
      role: 'GUTACHTER',
      companyName: 'Beispiel Sachverständige',
      phone: '+49300000002',
      city: 'Berlin',
      partnerId: partner2.id
    }
  });

  await prisma.partnerProfile.upsert({
    where: { clerkUserId: ANWALT_1_CLERK_ID },
    update: {},
    create: {
      clerkUserId: ANWALT_1_CLERK_ID,
      role: 'ANWALT',
      companyName: 'Kanzlei Testrecht',
      phone: '+49300000003',
      street: 'Kanzleiweg 5',
      zipCode: '10117',
      city: 'Berlin',
      partnerId: partner3.id
    }
  });

  // -------------------------------------------------------------------------
  // Leads
  // -------------------------------------------------------------------------

  const lead1 = await prisma.lead.upsert({
    where: { id: 'seed-lead-1' },
    update: {},
    create: {
      id: 'seed-lead-1',
      name: 'Karl Testfahrer',
      firstName: 'Karl',
      lastName: 'Testfahrer',
      phone: '+49170000001',
      email: 'karl.testfahrer@gt24-test.internal',
      status: 'NEW',
      source: 'COFORM'
    }
  });

  const lead2 = await prisma.lead.upsert({
    where: { id: 'seed-lead-2' },
    update: {},
    create: {
      id: 'seed-lead-2',
      name: 'Maria Probekundin',
      firstName: 'Maria',
      lastName: 'Probekundin',
      phone: '+49170000002',
      email: 'maria.probe@gt24-test.internal',
      status: 'CONTACTED',
      source: 'SIPGATE'
    }
  });

  console.log('[seed] Leads created:', lead1.id, lead2.id);

  // -------------------------------------------------------------------------
  // Cases
  // -------------------------------------------------------------------------

  const case1 = await prisma.case.upsert({
    where: { id: 'seed-case-1' },
    update: {},
    create: {
      id: 'seed-case-1',
      token: 'SEED1TESTTOKEN16',
      caseNumber: 'GT-0001',
      gutachterStatus: 'EINGEGANGEN',
      anwaltStatus: 'FALL_EINGEGANGEN',
      partnerId: partner1.id,
      leadId: lead1.id,
      customer: {
        create: {
          id: 'seed-customer-1',
          firstName: 'Karl',
          lastName: 'Testfahrer',
          email: 'karl.testfahrer@gt24-test.internal',
          phone: '+49170000001'
        }
      },
      intake: {
        create: {
          id: 'seed-intake-1',
          claimRoute: 'OPPONENT_LIABILITY',
          accidentDate: new Date('2026-09-01'),
          accidentLocation: 'Berlin, Alexanderplatz',
          accidentDescription: 'Heckauffahrunfall, Stoßstange beschädigt.',
          ownCarMake: 'Volkswagen',
          ownCarModel: 'Golf',
          ownCarYear: 2021,
          ownPlateNumber: 'B-TE-0001'
        }
      }
    }
  });

  const case2 = await prisma.case.upsert({
    where: { id: 'seed-case-2' },
    update: {},
    create: {
      id: 'seed-case-2',
      token: 'SEED2TESTTOKEN16',
      caseNumber: 'GT-0002',
      gutachterStatus: 'GUTACHTER_KONTAKTIERT',
      anwaltStatus: 'FALL_EINGEGANGEN',
      partnerId: partner2.id,
      customer: {
        create: {
          id: 'seed-customer-2',
          firstName: 'Maria',
          lastName: 'Probekundin',
          email: 'maria.probe@gt24-test.internal',
          phone: '+49170000002'
        }
      }
    }
  });

  const case3 = await prisma.case.upsert({
    where: { id: 'seed-case-3' },
    update: {},
    create: {
      id: 'seed-case-3',
      token: 'SEED3TESTTOKEN16',
      caseNumber: 'GT-0003',
      gutachterStatus: 'GUTACHTEN_ERSTELLT',
      anwaltStatus: 'FALL_IN_PRUEFUNG',
      partnerId: partner1.id
    }
  });

  console.log('[seed] Cases created:', case1.id, case2.id, case3.id);

  // -------------------------------------------------------------------------
  // CaseAssignments (expiresAt required)
  // -------------------------------------------------------------------------

  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await prisma.caseAssignment.upsert({
    where: { id: 'seed-assign-1' },
    update: {},
    create: {
      id: 'seed-assign-1',
      caseId: case1.id,
      role: 'GUTACHTER',
      assigneeClerkUserId: GUTACHTER_1_CLERK_ID,
      status: 'ACCEPTED',
      active: true,
      expiresAt: oneYear
    }
  });

  await prisma.caseAssignment.upsert({
    where: { id: 'seed-assign-2' },
    update: {},
    create: {
      id: 'seed-assign-2',
      caseId: case3.id,
      role: 'ANWALT',
      assigneeClerkUserId: ANWALT_1_CLERK_ID,
      status: 'ACCEPTED',
      active: true,
      expiresAt: oneYear
    }
  });

  // -------------------------------------------------------------------------
  // CaseFiles (metadata only — storageKey prefixed supabase:seed/ = no real object)
  // -------------------------------------------------------------------------

  await prisma.caseFile.upsert({
    where: { id: 'seed-file-1' },
    update: {},
    create: {
      id: 'seed-file-1',
      caseId: case1.id,
      uploaderType: 'CUSTOMER',
      visibility: 'CUSTOMER_AND_PARTNERS',
      category: 'CUSTOMER_PHOTOS',
      filename: 'schaden-vorne.jpg',
      mimeType: 'image/jpeg',
      size: 204800,
      storageKey: 'supabase:seed/case1/schaden-vorne.jpg',
      classificationStatus: 'PENDING'
    }
  });

  await prisma.caseFile.upsert({
    where: { id: 'seed-file-2' },
    update: {},
    create: {
      id: 'seed-file-2',
      caseId: case3.id,
      uploaderType: 'PARTNER',
      uploaderId: GUTACHTER_1_CLERK_ID,
      role: 'GUTACHTER',
      visibility: 'PARTNERS',
      category: 'GUTACHTEN',
      filename: 'gutachten-final.pdf',
      mimeType: 'application/pdf',
      size: 1048576,
      storageKey: 'supabase:seed/case3/gutachten-final.pdf',
      classificationStatus: 'CLASSIFIED',
      documentType: 'GUTACHTEN_MAIN',
      classificationConfidence: 'HIGH'
    }
  });

  // -------------------------------------------------------------------------
  // CaseGutachtenInsight
  // -------------------------------------------------------------------------

  await prisma.caseGutachtenInsight.upsert({
    where: { caseId: case3.id },
    update: {},
    create: {
      caseId: case3.id,
      sourceCaseFileId: 'seed-file-2',
      status: 'AVAILABLE',
      summaryShort: 'Heckschaden, Reparaturkosten 3.200 EUR netto.',
      schadenshoeheNetto: 3200.0,
      schadenshoeheBrutto: 3808.0,
      reparaturkostenNetto: 3200.0,
      reparaturkostenBrutto: 3808.0,
      reparaturwuerdig: true,
      abrechnungsart: 'REPARATUR'
    }
  });

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  await prisma.notification.upsert({
    where: { id: 'seed-notif-1' },
    update: {},
    create: {
      id: 'seed-notif-1',
      userId: GUTACHTER_1_CLERK_ID,
      caseId: case1.id,
      role: 'GUTACHTER',
      type: 'ASSIGNMENT_CREATED',
      title: 'Neue Fallzuweisung: GT-0001'
    }
  });

  await prisma.notification.upsert({
    where: { id: 'seed-notif-2' },
    update: {},
    create: {
      id: 'seed-notif-2',
      userId: ANWALT_1_CLERK_ID,
      caseId: case3.id,
      role: 'ANWALT',
      type: 'ASSIGNMENT_CREATED',
      title: 'Neue Fallzuweisung: GT-0003',
      readAt: new Date('2026-10-01')
    }
  });

  // -------------------------------------------------------------------------
  // PartnerAvailabilitySlot
  // -------------------------------------------------------------------------

  await prisma.partnerAvailabilitySlot.upsert({
    where: { id: 'seed-slot-1' },
    update: {},
    create: {
      id: 'seed-slot-1',
      partnerId: partner1.id,
      role: 'GUTACHTER',
      appointmentType: 'IN_PERSON',
      duration: 'MINUTES_30',
      weekday: 1, // Monday
      startTime: '09:00',
      endTime: '17:00',
      isActive: true
    }
  });

  // -------------------------------------------------------------------------
  // CaseNumberSequence
  // -------------------------------------------------------------------------

  await prisma.caseNumberSequence.upsert({
    where: { id: 'seed-seq-1' },
    update: {},
    create: {
      id: 'seed-seq-1',
      currentValue: 3
    }
  });

  console.log('[seed] GT24 NEXT synthetic seed v2 complete.');
  console.log('[seed] Summary: 3 Partners + Profiles, 2 Leads, 3 Cases,');
  console.log('[seed]          2 Assignments, 2 Files, 1 Insight,');
  console.log(
    '[seed]          2 Notifications, 1 AvailabilitySlot, 1 Sequence'
  );
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
