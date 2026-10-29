/**
 * GT24 NEXT — Deterministic Synthetic Seed
 *
 * All data is synthetic. No real customer information.
 * All emails use @gt24-test.internal domain (SC-18).
 * All names are fictional.
 *
 * Run: pnpm prisma db seed
 * Requires: GT24 NEXT Supabase database (not production).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Synthetic Clerk userIds (format matches Clerk user_ prefix, clearly fake)
const ADMIN_CLERK_ID = 'user_test_admin_001';
const GUTACHTER_1_CLERK_ID = 'user_test_gutachter_001';
const GUTACHTER_2_CLERK_ID = 'user_test_gutachter_002';
const ANWALT_1_CLERK_ID = 'user_test_anwalt_001';

async function main() {
  console.log('[seed] Starting GT24 NEXT synthetic seed...');

  // Safety check: refuse to seed if production bucket is configured
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? '';
  if (bucket === 'gt24-case-files') {
    throw new Error(
      '[seed] SUPABASE_STORAGE_BUCKET is gt24-case-files (production). ' +
        'Refusing to seed. SC-11.'
    );
  }

  // -------------------------------------------------------------------------
  // Partners (Gutachter + Anwalt)
  // -------------------------------------------------------------------------

  const gutachter1 = await prisma.partner.upsert({
    where: { id: 'seed-partner-gutachter-1' },
    update: {},
    create: {
      id: 'seed-partner-gutachter-1',
      clerkUserId: GUTACHTER_1_CLERK_ID,
      email: 'max.muster@gt24-test.internal',
      name: 'Max Muster',
      type: 'GUTACHTER',
      phone: '+49300000001'
    }
  });

  const gutachter2 = await prisma.partner.upsert({
    where: { id: 'seed-partner-gutachter-2' },
    update: {},
    create: {
      id: 'seed-partner-gutachter-2',
      clerkUserId: GUTACHTER_2_CLERK_ID,
      email: 'anna.beispiel@gt24-test.internal',
      name: 'Anna Beispiel',
      type: 'GUTACHTER',
      phone: '+49300000002'
    }
  });

  const anwalt1 = await prisma.partner.upsert({
    where: { id: 'seed-partner-anwalt-1' },
    update: {},
    create: {
      id: 'seed-partner-anwalt-1',
      clerkUserId: ANWALT_1_CLERK_ID,
      email: 'thomas.kanzlei@gt24-test.internal',
      name: 'Thomas Kanzlei',
      type: 'ANWALT',
      phone: '+49300000003'
    }
  });

  console.log(
    '[seed] Partners created:',
    gutachter1.id,
    gutachter2.id,
    anwalt1.id
  );

  // -------------------------------------------------------------------------
  // Partner Profiles
  // -------------------------------------------------------------------------

  await prisma.partnerProfile.upsert({
    where: { id: 'seed-profile-gutachter-1' },
    update: {},
    create: {
      id: 'seed-profile-gutachter-1',
      partnerId: gutachter1.id,
      bio: 'Kfz-Sachverständiger mit 10 Jahren Erfahrung.',
      street: 'Musterstraße 1',
      zipCode: '10115',
      city: 'Berlin'
    }
  });

  await prisma.partnerProfile.upsert({
    where: { id: 'seed-profile-anwalt-1' },
    update: {},
    create: {
      id: 'seed-profile-anwalt-1',
      partnerId: anwalt1.id,
      bio: 'Rechtsanwalt für Verkehrsrecht.',
      street: 'Kanzleiweg 5',
      zipCode: '10117',
      city: 'Berlin'
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
      firstName: 'Karl',
      lastName: 'Testfahrer',
      phone: '+49170000001',
      email: 'karl.testfahrer@gt24-test.internal',
      street: 'Teststraße 1',
      houseNumber: '1a',
      zipCode: '10115',
      city: 'Berlin',
      status: 'NEW',
      source: 'COFORM'
    }
  });

  const lead2 = await prisma.lead.upsert({
    where: { id: 'seed-lead-2' },
    update: {},
    create: {
      id: 'seed-lead-2',
      firstName: 'Maria',
      lastName: 'Probekundin',
      phone: '+49170000002',
      email: 'maria.probe@gt24-test.internal',
      street: 'Beispielweg 2',
      houseNumber: '2b',
      zipCode: '10116',
      city: 'Berlin',
      status: 'CONTACTED',
      source: 'SIPGATE'
    }
  });

  console.log('[seed] Leads created:', lead1.id, lead2.id);

  // -------------------------------------------------------------------------
  // Cases (multiple statuses)
  // -------------------------------------------------------------------------

  const case1 = await prisma.case.upsert({
    where: { id: 'seed-case-1' },
    update: {},
    create: {
      id: 'seed-case-1',
      token: 'SEED1TESTTOKEN16',
      caseNumber: 'GT-0001',
      gutachterStatus: 'EINGEGANGEN',
      anwaltStatus: 'OFFEN',
      partnerId: gutachter1.id,
      leadId: lead1.id,
      customer: {
        create: {
          id: 'seed-customer-1',
          firstName: 'Karl',
          lastName: 'Testfahrer',
          email: 'karl.testfahrer@gt24-test.internal',
          phone: '+49170000001',
          street: 'Teststraße 1',
          houseNumber: '1a',
          zipCode: '10115',
          city: 'Berlin'
        }
      },
      intake: {
        create: {
          id: 'seed-intake-1',
          accidentDate: new Date('2026-09-01'),
          accidentLocation: 'Berlin, Alexanderplatz',
          damageDescription: 'Heckauffahrunfall, Stoßstange beschädigt.',
          vehicleMake: 'Volkswagen',
          vehicleModel: 'Golf',
          vehicleYear: 2021,
          licensePlate: 'B-TE-0001',
          mileage: 45000
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
      anwaltStatus: 'OFFEN',
      partnerId: gutachter2.id,
      customer: {
        create: {
          id: 'seed-customer-2',
          firstName: 'Maria',
          lastName: 'Probekundin',
          email: 'maria.probe@gt24-test.internal',
          phone: '+49170000002',
          street: 'Beispielweg 2',
          houseNumber: '2b',
          zipCode: '10116',
          city: 'Berlin'
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
      anwaltStatus: 'IN_BEARBEITUNG',
      partnerId: gutachter1.id
    }
  });

  console.log('[seed] Cases created:', case1.id, case2.id, case3.id);

  // -------------------------------------------------------------------------
  // CaseAssignments
  // -------------------------------------------------------------------------

  await prisma.caseAssignment.upsert({
    where: { id: 'seed-assign-1' },
    update: {},
    create: {
      id: 'seed-assign-1',
      caseId: case1.id,
      partnerId: gutachter1.id,
      role: 'GUTACHTER',
      status: 'ACTIVE',
      activeKey: 'seed-key-001'
    }
  });

  await prisma.caseAssignment.upsert({
    where: { id: 'seed-assign-2' },
    update: {},
    create: {
      id: 'seed-assign-2',
      caseId: case3.id,
      partnerId: anwalt1.id,
      role: 'ANWALT',
      status: 'ACTIVE',
      activeKey: 'seed-key-002'
    }
  });

  // -------------------------------------------------------------------------
  // CaseInsurance
  // -------------------------------------------------------------------------

  await prisma.caseInsurance.upsert({
    where: { id: 'seed-insurance-1' },
    update: {},
    create: {
      id: 'seed-insurance-1',
      caseId: case1.id,
      insurerName: 'Musterversicherung AG',
      policyNumber: 'TEST-POL-001',
      claimNumber: 'TEST-CLAIM-001',
      insuranceParty: 'OPPONENT',
      claimRoute: 'HAFTPFLICHT'
    }
  });

  // -------------------------------------------------------------------------
  // CaseFiles (metadata only — no actual storage objects)
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
  // GutachtenInsight
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
      caseId: case1.id,
      recipientId: GUTACHTER_1_CLERK_ID,
      type: 'ASSIGNMENT_CREATED',
      read: false
    }
  });

  await prisma.notification.upsert({
    where: { id: 'seed-notif-2' },
    update: {},
    create: {
      id: 'seed-notif-2',
      caseId: case3.id,
      recipientId: ANWALT_1_CLERK_ID,
      type: 'ASSIGNMENT_CREATED',
      read: true
    }
  });

  // -------------------------------------------------------------------------
  // PartnerAvailabilitySlot + AppointmentRequest
  // -------------------------------------------------------------------------

  const slot1 = await prisma.partnerAvailabilitySlot.upsert({
    where: { id: 'seed-slot-1' },
    update: {},
    create: {
      id: 'seed-slot-1',
      partnerId: gutachter1.id,
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '17:00',
      specificDate: new Date('2026-11-03')
    }
  });

  await prisma.caseAppointmentRequest.upsert({
    where: { id: 'seed-appt-req-1' },
    update: {},
    create: {
      id: 'seed-appt-req-1',
      caseId: case1.id,
      requestedByPartnerId: gutachter1.id,
      role: 'GUTACHTER',
      appointmentType: 'INSPECTION',
      durationMinutes: 60,
      status: 'PENDING',
      notes: 'Fahrzeugbesichtigung beim Kunden'
    }
  });

  console.log('[seed] Scheduling records created:', slot1.id);

  // -------------------------------------------------------------------------
  // CaseNumberSequence
  // -------------------------------------------------------------------------

  await prisma.caseNumberSequence.upsert({
    where: { id: 'seed-seq-1' },
    update: {},
    create: {
      id: 'seed-seq-1',
      lastNumber: 3
    }
  });

  console.log('[seed] GT24 NEXT synthetic seed complete.');
  console.log('[seed] Summary: 3 Partners, 2 Leads, 3 Cases, 2 Assignments,');
  console.log(
    '[seed]          1 Insurance, 2 Files, 1 Insight, 2 Notifications,'
  );
  console.log('[seed]          1 AvailabilitySlot, 1 AppointmentRequest');
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
