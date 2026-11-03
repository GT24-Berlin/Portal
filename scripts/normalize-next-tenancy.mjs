/**
 * GT24 NEXT — Phase 3B-2A.5 Tenancy Normalization Script
 *
 * Normalizes existing synthetic NEXT seed data to satisfy canonical
 * Phase 3B tenancy and assignment invariants. Safe to rerun (idempotent).
 *
 * NEXT ONLY — fails closed if GT24_ENVIRONMENT !== 'next' or if the
 * production storage bucket is detected.
 *
 * Performs ONE Prisma transaction containing:
 *   A. INTERNAL OWNER CaseOrganization upserts for seed-case-1..3
 *   B. activeKey='ACTIVE' normalization for ACCEPTED+active+null assignments
 *   C. ASSIGNED CaseOrganization upserts (org resolved from DB Membership)
 *
 * Run: node scripts/normalize-next-tenancy.mjs
 * Dry-run: DRY_RUN=1 node scripts/normalize-next-tenancy.mjs
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const req = createRequire(join(projectRoot, 'package.json'));
const dotenv = req('dotenv');
dotenv.config({ path: join(projectRoot, '.env') });
dotenv.config({ path: join(projectRoot, '.env.local'), override: true });

// ── Environment guard (fail closed) ──────────────────────────────────────────

const GT24_ENVIRONMENT = process.env.GT24_ENVIRONMENT;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;
const DRY_RUN = process.env.DRY_RUN === '1';

if (GT24_ENVIRONMENT !== 'next') {
  console.error(
    `[normalize] STOP: GT24_ENVIRONMENT="${GT24_ENVIRONMENT}". ` +
      'This script may only run in the NEXT environment.'
  );
  process.exit(1);
}

if (SUPABASE_STORAGE_BUCKET === 'gt24-case-files') {
  console.error(
    '[normalize] STOP: SUPABASE_STORAGE_BUCKET is the production bucket. Refusing.'
  );
  process.exit(1);
}

console.log(`[normalize] Environment verified: GT24_ENVIRONMENT=next, bucket=${SUPABASE_STORAGE_BUCKET}`);
if (DRY_RUN) console.log('[normalize] DRY_RUN mode — no writes will be made');

// ── Prisma setup ──────────────────────────────────────────────────────────────

const { PrismaClient } = req('@prisma/client');
const { PrismaPg } = req('@prisma/adapter-pg');
const { Pool } = req('pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
  log: ['error']
});

// ── Constants ─────────────────────────────────────────────────────────────────

const SEED_CASES = ['seed-case-1', 'seed-case-2', 'seed-case-3'];
const INTERNAL_ORG_ID = 'org-gt24-internal';

// ── Main ──────────────────────────────────────────────────────────────────────

async function normalize() {
  console.log('\n[normalize] Starting Phase 3B-2A.5 normalization...');

  // ── Step 0: Pre-transaction validation ────────────────────────────────────

  // Verify INTERNAL org exists
  const internalOrg = await prisma.organization.findUnique({
    where: { id: INTERNAL_ORG_ID }
  });
  if (!internalOrg || internalOrg.status !== 'ACTIVE') {
    throw new Error(
      `[normalize] STOP: INTERNAL org "${INTERNAL_ORG_ID}" not found or not ACTIVE.`
    );
  }

  // Verify seed cases exist and are synthetic
  for (const caseId of SEED_CASES) {
    const c = await prisma.case.findUnique({ where: { id: caseId } });
    if (!c) {
      throw new Error(
        `[normalize] STOP: Case "${caseId}" not found. Expected synthetic seed case.`
      );
    }
    if (!caseId.startsWith('seed-')) {
      throw new Error(
        `[normalize] STOP: Case "${caseId}" does not have "seed-" prefix. Not synthetic.`
      );
    }
  }

  // Collect ACCEPTED+active=true+activeKey=null assignments for seed cases
  const assignmentsToNormalize = await prisma.caseAssignment.findMany({
    where: {
      caseId: { in: SEED_CASES },
      status: 'ACCEPTED',
      active: true,
      activeKey: null
    }
  });

  console.log(`[normalize] Found ${assignmentsToNormalize.length} assignment(s) needing activeKey normalization`);

  // For each: resolve assignee organization and check for conflicts
  const assignmentPlan = [];
  for (const a of assignmentsToNormalize) {
    // Verify assignee is synthetic
    if (!a.assigneeClerkUserId.startsWith('user_test_')) {
      throw new Error(
        `[normalize] STOP: assigneeClerkUserId="${a.assigneeClerkUserId}" does not have ` +
          '"user_test_" prefix. Not a synthetic identity. Refusing.'
      );
    }

    // Verify unique constraint: no row with activeKey='ACTIVE' already exists for this case+role
    const existing = await prisma.caseAssignment.findFirst({
      where: { caseId: a.caseId, role: a.role, activeKey: 'ACTIVE' }
    });
    if (existing && existing.id !== a.id) {
      throw new Error(
        `[normalize] STOP: Unique constraint conflict — assignment ${existing.id} already ` +
          `has activeKey='ACTIVE' for case=${a.caseId} role=${a.role}. ROLL BACK.`
      );
    }

    // Resolve assignee organization via DB Membership
    // GUTACHTER assignment → ACTIVE GUTACHTER org
    // ANWALT assignment → ACTIVE LEGAL org
    const expectedOrgType = a.role === 'GUTACHTER' ? 'GUTACHTER' : 'LEGAL';
    const memberships = await prisma.membership.findMany({
      where: {
        clerkUserId: a.assigneeClerkUserId,
        status: 'ACTIVE',
        organization: { type: expectedOrgType, status: 'ACTIVE' }
      },
      include: { organization: true }
    });

    if (memberships.length === 0) {
      throw new Error(
        `[normalize] STOP: No ACTIVE ${expectedOrgType} membership found for ` +
          `assignee=${a.assigneeClerkUserId}. Cannot resolve ASSIGNED org. ROLL BACK.`
      );
    }
    if (memberships.length > 1) {
      throw new Error(
        `[normalize] STOP: Ambiguous — ${memberships.length} ACTIVE ${expectedOrgType} ` +
          `memberships found for assignee=${a.assigneeClerkUserId}. ROLL BACK.`
      );
    }

    assignmentPlan.push({
      assignment: a,
      resolvedOrgId: memberships[0].organizationId,
      resolvedOrgType: memberships[0].organization.type
    });

    console.log(
      `[normalize] Plan: assignment ${a.id} (${a.role}, case=${a.caseId}) → ` +
        `org=${memberships[0].organizationId} (${memberships[0].organization.type})`
    );
  }

  // ── Dry-run summary ────────────────────────────────────────────────────────

  if (DRY_RUN) {
    console.log('\n[normalize] DRY_RUN — planned changes:');
    console.log('  A. INTERNAL OWNER upserts:', SEED_CASES.length);
    console.log('  B. activeKey normalization:', assignmentsToNormalize.length);
    console.log('  C. ASSIGNED CaseOrg upserts:', assignmentPlan.length);
    console.log('[normalize] DRY_RUN complete — no writes made.');
    return;
  }

  // ── Execute in ONE transaction ─────────────────────────────────────────────

  const result = await prisma.$transaction(async (tx) => {
    const changes = { ownerUpserts: 0, activeKeyUpdates: 0, assignedUpserts: 0 };

    // A. INTERNAL OWNER CaseOrganization upserts
    for (const caseId of SEED_CASES) {
      await tx.caseOrganization.upsert({
        where: {
          caseId_organizationId_role: {
            caseId,
            organizationId: INTERNAL_ORG_ID,
            role: 'OWNER'
          }
        },
        update: {},
        create: { caseId, organizationId: INTERNAL_ORG_ID, role: 'OWNER' }
      });
      changes.ownerUpserts++;
    }

    // B. Assignment activeKey normalization
    for (const { assignment } of assignmentPlan) {
      await tx.caseAssignment.update({
        where: { id: assignment.id },
        data: { activeKey: 'ACTIVE' }
      });
      changes.activeKeyUpdates++;
    }

    // C. ASSIGNED CaseOrganization upserts
    for (const { assignment, resolvedOrgId } of assignmentPlan) {
      await tx.caseOrganization.upsert({
        where: {
          caseId_organizationId_role: {
            caseId: assignment.caseId,
            organizationId: resolvedOrgId,
            role: 'ASSIGNED'
          }
        },
        update: {},
        create: {
          caseId: assignment.caseId,
          organizationId: resolvedOrgId,
          role: 'ASSIGNED'
        }
      });
      changes.assignedUpserts++;
    }

    return changes;
  });

  console.log('\n[normalize] Transaction committed successfully.');
  console.log('  A. OWNER upserts:', result.ownerUpserts);
  console.log('  B. activeKey updates:', result.activeKeyUpdates);
  console.log('  C. ASSIGNED upserts:', result.assignedUpserts);
}

normalize()
  .catch((e) => {
    console.error('\n[normalize] FATAL ERROR — transaction rolled back:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
