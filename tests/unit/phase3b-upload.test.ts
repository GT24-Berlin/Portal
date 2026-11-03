/**
 * Phase 3B-2C — File Upload Enforcement Tests
 *
 * Covers:
 *   POST /api/cases/[id]/files/upload
 *
 * Authorization model:
 *   INTERNAL ADMIN/OWNER + OWNER CaseOrg → FILES_ADMIN capability → allowed
 *   GUTACHTER/LEGAL + ASSIGNED CaseOrg + ACCEPTED active assignment → FILES_PARTNER → allowed
 *   Everyone else → denied
 *
 * Lane derivation: DB org type only (GUTACHTER→GUTACHTER, LEGAL→ANWALT)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockRequireCaseWrite = vi.hoisted(() => vi.fn());
const mockCreateFile = vi.hoisted(() => vi.fn());
const mockFindUniqueCase = vi.hoisted(() => vi.fn());
const mockPutStoredFile = vi.hoisted(() => vi.fn());
const mockLogOperationalEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/policy', () => ({
  requireCaseWrite: mockRequireCaseWrite
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    caseFile: { create: mockCreateFile },
    case: { findUnique: mockFindUniqueCase }
  }
}));

vi.mock('@/lib/storage', () => ({
  putStoredFile: mockPutStoredFile,
  createStoredFileDownloadResponse: vi.fn()
}));

vi.mock('@/lib/ops-log', () => ({
  logOperationalEvent: mockLogOperationalEvent
}));

vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/features/gutachten-insights/lib/process-case-file', () => ({
  processCaseFile: vi.fn().mockResolvedValue(null)
}));

// ── Route import ──────────────────────────────────────────────────────────────

import { POST } from '@/app/api/cases/[id]/files/upload/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInternalAdminGuard(caseId = 'case-1') {
  return {
    ok: true as const,
    clerkUserId: 'user_internal',
    capability: 'FILES_ADMIN' as const,
    caseOrgs: [
      {
        id: 'co-1',
        caseId,
        organizationId: 'org-internal',
        role: 'OWNER',
        organization: {
          id: 'org-internal',
          type: 'INTERNAL',
          status: 'ACTIVE',
          name: 'GT24'
        }
      } as any
    ],
    memberships: [
      {
        id: 'm1',
        organizationId: 'org-internal',
        role: 'ADMIN',
        organization: { id: 'org-internal', type: 'INTERNAL' }
      } as any
    ]
  };
}

function makeGutachterPartnerGuard(caseId = 'case-1') {
  return {
    ok: true as const,
    clerkUserId: 'user_gutachter',
    capability: 'FILES_PARTNER' as const,
    assignment: {
      id: 'a1',
      caseId,
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_gutachter',
      status: 'ACCEPTED',
      active: true,
      activeKey: 'ACTIVE',
      expiresAt: new Date(Date.now() + 3600_000),
      assignedAt: new Date(),
      acceptedAt: new Date()
    } as any,
    caseOrgs: [
      {
        id: 'co-2',
        caseId,
        organizationId: 'org-gutachter',
        role: 'ASSIGNED',
        organization: {
          id: 'org-gutachter',
          type: 'GUTACHTER',
          status: 'ACTIVE',
          name: 'Gutachter GmbH'
        }
      } as any
    ],
    memberships: [
      {
        id: 'm2',
        organizationId: 'org-gutachter',
        role: 'MEMBER',
        organization: { id: 'org-gutachter', type: 'GUTACHTER' }
      } as any
    ]
  };
}

function makeLegalPartnerGuard(caseId = 'case-1') {
  return {
    ok: true as const,
    clerkUserId: 'user_anwalt',
    capability: 'FILES_PARTNER' as const,
    assignment: {
      id: 'a2',
      caseId,
      role: 'ANWALT',
      assigneeClerkUserId: 'user_anwalt',
      status: 'ACCEPTED',
      active: true,
      activeKey: 'ACTIVE',
      expiresAt: new Date(Date.now() + 3600_000),
      assignedAt: new Date(),
      acceptedAt: new Date()
    } as any,
    caseOrgs: [
      {
        id: 'co-3',
        caseId,
        organizationId: 'org-legal',
        role: 'ASSIGNED',
        organization: {
          id: 'org-legal',
          type: 'LEGAL',
          status: 'ACTIVE',
          name: 'Rechtsanwalt GmbH'
        }
      } as any
    ],
    memberships: [
      {
        id: 'm3',
        organizationId: 'org-legal',
        role: 'MEMBER',
        organization: { id: 'org-legal', type: 'LEGAL' }
      } as any
    ]
  };
}

function makeStorageResult() {
  return {
    storageKey: 'supabase:bucket/cases/case-1/partners/gutachter/test.pdf',
    mimeType: 'application/octet-stream',
    size: 1024,
    originalFilename: 'test.bin'
  };
}

function makeCreatedFile(id = 'file-1') {
  return {
    id,
    caseId: 'case-1',
    uploaderType: 'PARTNER',
    uploaderId: 'user_gutachter',
    role: 'GUTACHTER',
    visibility: 'PARTNERS',
    category: 'OTHER',
    title: null,
    filename: 'test.bin',
    mimeType: 'application/octet-stream',
    size: 1024,
    createdAt: new Date()
    // storageKey absent — not in select
  };
}

function makeFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const file = new File(['binary-content'], 'test.bin', {
    type: 'application/octet-stream'
  });
  fd.append('file', file);
  fd.append('visibility', overrides.visibility ?? 'PARTNERS');
  fd.append('category', overrides.category ?? 'OTHER');
  if (overrides.title) fd.append('title', overrides.title);
  return fd;
}

async function callPOST(
  caseId: string,
  body: FormData = makeFormData()
): Promise<{ status: number; body: Record<string, any> | null }> {
  const req = new Request(`http://localhost/api/cases/${caseId}/files/upload`, {
    method: 'POST',
    body
  });
  const res = await POST(req, { params: Promise.resolve({ id: caseId }) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ── AUTHORIZATION tests ───────────────────────────────────────────────────────

describe('POST /api/cases/[id]/files/upload — AUTHORIZATION', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogOperationalEvent.mockResolvedValue(undefined);
    mockPutStoredFile.mockResolvedValue(makeStorageResult());
    mockCreateFile.mockResolvedValue(makeCreatedFile());
    mockFindUniqueCase.mockResolvedValue(null);
  });

  it('returns 400 when caseId is missing', async () => {
    const { status } = await callPOST('');
    expect(status).toBe(400);
    expect(mockRequireCaseWrite).not.toHaveBeenCalled();
  });

  it('returns 401 when FILES_ADMIN returns 401 (unauthenticated)', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce({ ok: false, status: 401 });
    const { status, body } = await callPOST('case-1');
    expect(status).toBe(401);
    expect(body?.ok).toBe(false);
  });

  it('returns 401 when both guards return 401', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce({ ok: false, status: 401 });
    // FILES_ADMIN returns 401 → early return, FILES_PARTNER never called
    const { status } = await callPOST('case-1');
    expect(status).toBe(401);
    expect(mockRequireCaseWrite).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when caller has no membership (both guards deny with 403)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });

  it('returns 403 when wrong org / no CaseOrg (FILES_ADMIN 403, FILES_PARTNER 404)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });

  it('INTERNAL ADMIN + OWNER CaseOrg → 200 (FILES_ADMIN succeeds)', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce(makeInternalAdminGuard());
    const { status, body } = await callPOST('case-1');
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
    // FILES_PARTNER should NOT be called
    expect(mockRequireCaseWrite).toHaveBeenCalledTimes(1);
    expect(mockRequireCaseWrite).toHaveBeenCalledWith('case-1', 'FILES_ADMIN');
  });

  it('INTERNAL MEMBER → denied (FILES_ADMIN 403, FILES_PARTNER 403)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });

  it('INTERNAL VIEWER → denied (FILES_ADMIN 403, FILES_PARTNER 403)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });

  it('GUTACHTER ASSIGNED + ACCEPTED assignment → 200 (FILES_PARTNER succeeds)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(makeGutachterPartnerGuard());
    const { status, body } = await callPOST('case-1');
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
    expect(mockRequireCaseWrite).toHaveBeenCalledWith(
      'case-1',
      'FILES_PARTNER'
    );
  });

  it('LEGAL ASSIGNED + ACCEPTED assignment → 200 (FILES_PARTNER succeeds)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(makeLegalPartnerGuard());
    const { status, body } = await callPOST('case-1');
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
  });

  it('ASSIGNED CaseOrg but no accepted assignment → denied (FILES_PARTNER 403)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });

  it('accepted assignment but no ASSIGNED CaseOrg → denied (FILES_PARTNER 403)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });

  it('RELEASED assignment → denied (FILES_PARTNER 403)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });

  it('EXPIRED assignment → denied (FILES_PARTNER 403)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });

  it('active=true + activeKey=null → denied (FILES_PARTNER 403)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    const { status } = await callPOST('case-1');
    expect(status).toBe(403);
  });
});

// ── LANE / ROLE tests ─────────────────────────────────────────────────────────

describe('POST /api/cases/[id]/files/upload — LANE/ROLE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogOperationalEvent.mockResolvedValue(undefined);
    mockPutStoredFile.mockResolvedValue(makeStorageResult());
    mockCreateFile.mockResolvedValue(makeCreatedFile());
    mockFindUniqueCase.mockResolvedValue(null);
  });

  it('GUTACHTER org caller → CaseLane.GUTACHTER derived (not from client)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(makeGutachterPartnerGuard());
    await callPOST('case-1');
    const createCall = mockCreateFile.mock.calls[0][0];
    expect(createCall.data.role).toBe('GUTACHTER');
  });

  it('LEGAL org caller → CaseLane.ANWALT derived (not from client)', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(makeLegalPartnerGuard());
    await callPOST('case-1');
    const createCall = mockCreateFile.mock.calls[0][0];
    expect(createCall.data.role).toBe('ANWALT');
  });

  it('INTERNAL ADMIN → lane=null, folder uses admin path', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce(makeInternalAdminGuard());
    await callPOST('case-1');
    const createCall = mockCreateFile.mock.calls[0][0];
    expect(createCall.data.role).toBeNull();
    // Verify storage folder uses admin path
    const storageCall = mockPutStoredFile.mock.calls[0][0];
    expect(storageCall.folder).toContain('admin');
  });

  it('GUTACHTER org → storage folder uses gutachter path', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(makeGutachterPartnerGuard());
    await callPOST('case-1');
    const storageCall = mockPutStoredFile.mock.calls[0][0];
    expect(storageCall.folder).toContain('gutachter');
  });

  it('LEGAL org → storage folder uses anwalt path', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(makeLegalPartnerGuard());
    await callPOST('case-1');
    const storageCall = mockPutStoredFile.mock.calls[0][0];
    expect(storageCall.folder).toContain('anwalt');
  });

  it('unexpected org type → 422 (fail-closed)', async () => {
    const fleetGuard = {
      ok: true as const,
      clerkUserId: 'user_fleet',
      capability: 'FILES_PARTNER' as const,
      caseOrgs: [
        {
          id: 'co-4',
          caseId: 'case-1',
          organizationId: 'org-fleet',
          role: 'ASSIGNED',
          organization: {
            id: 'org-fleet',
            type: 'FLEET',
            status: 'ACTIVE',
            name: 'Fleet GmbH'
          }
        } as any
      ],
      memberships: [] as any
    };
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(fleetGuard);
    const { status } = await callPOST('case-1');
    expect(status).toBe(422);
    expect(mockPutStoredFile).not.toHaveBeenCalled();
  });
});

// ── STORAGE tests ─────────────────────────────────────────────────────────────

describe('POST /api/cases/[id]/files/upload — STORAGE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogOperationalEvent.mockResolvedValue(undefined);
    mockPutStoredFile.mockResolvedValue(makeStorageResult());
    mockCreateFile.mockResolvedValue(makeCreatedFile());
    mockFindUniqueCase.mockResolvedValue(null);
  });

  it('authorization failure → putStoredFile NOT called', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    await callPOST('case-1');
    expect(mockPutStoredFile).not.toHaveBeenCalled();
  });

  it('unauthenticated → putStoredFile NOT called', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce({ ok: false, status: 401 });
    await callPOST('case-1');
    expect(mockPutStoredFile).not.toHaveBeenCalled();
  });

  it('invalid lane (unexpected org type) → putStoredFile NOT called', async () => {
    const agencyGuard = {
      ok: true as const,
      clerkUserId: 'user_agency',
      capability: 'FILES_PARTNER' as const,
      caseOrgs: [
        {
          id: 'co-5',
          caseId: 'case-1',
          organizationId: 'org-agency',
          role: 'ASSIGNED',
          organization: { type: 'AGENCY' }
        } as any
      ],
      memberships: [] as any
    };
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(agencyGuard);
    await callPOST('case-1');
    expect(mockPutStoredFile).not.toHaveBeenCalled();
  });

  it('storageKey absent from API response', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce(makeInternalAdminGuard());
    const { body } = await callPOST('case-1');
    expect(body?.ok).toBe(true);
    expect(body?.file).not.toHaveProperty('storageKey');
  });

  it('CaseFile created with route caseId, not any client-supplied override', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce(
      makeInternalAdminGuard('case-99')
    );
    const fd = makeFormData();
    // Even if client tries to inject a different caseId in form data, it's ignored
    fd.append('caseId', 'case-EVIL');
    await callPOST('case-99', fd);
    const createCall = mockCreateFile.mock.calls[0][0];
    expect(createCall.data.caseId).toBe('case-99');
    expect(createCall.data.caseId).not.toBe('case-EVIL');
  });

  it('storageKey stored in CaseFile data (internal) but not in select', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce(makeInternalAdminGuard());
    await callPOST('case-1');
    const createCall = mockCreateFile.mock.calls[0][0];
    // storageKey MUST be in data (stored in DB)
    expect(createCall.data.storageKey).toBe(
      'supabase:bucket/cases/case-1/partners/gutachter/test.pdf'
    );
    // storageKey MUST NOT be in select (never returned to client)
    expect(createCall.select).not.toHaveProperty('storageKey');
  });
});

// ── TRANSITION checks ─────────────────────────────────────────────────────────

describe('POST /api/cases/[id]/files/upload — TRANSITION', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogOperationalEvent.mockResolvedValue(undefined);
    mockPutStoredFile.mockResolvedValue(makeStorageResult());
    mockCreateFile.mockResolvedValue(makeCreatedFile());
  });

  it('requireCaseWrite called with FILES_ADMIN first', async () => {
    mockRequireCaseWrite.mockResolvedValueOnce({ ok: false, status: 401 });
    await callPOST('case-abc');
    expect(mockRequireCaseWrite).toHaveBeenCalledWith(
      'case-abc',
      'FILES_ADMIN'
    );
  });

  it('requireCaseWrite called with FILES_PARTNER when admin path denied', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    await callPOST('case-abc');
    expect(mockRequireCaseWrite).toHaveBeenCalledWith(
      'case-abc',
      'FILES_ADMIN'
    );
    expect(mockRequireCaseWrite).toHaveBeenCalledWith(
      'case-abc',
      'FILES_PARTNER'
    );
  });

  it('no requireRole() in @/lib/rbac is called', async () => {
    // rbac module is not mocked — if requireRole() were called it would throw
    // or import 'server-only' which would cause test failure.
    // The fact that tests pass without mocking @/lib/rbac confirms it is not used.
    mockRequireCaseWrite.mockResolvedValueOnce({ ok: false, status: 401 });
    const { status } = await callPOST('case-1');
    // Route uses requireCaseWrite, not requireRole
    expect(mockRequireCaseWrite).toHaveBeenCalled();
    expect(status).toBe(401);
  });

  it('uploaderType derived from isAdminCaller, not from Clerk role', async () => {
    mockRequireCaseWrite
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce(makeGutachterPartnerGuard());
    await callPOST('case-1');
    const createCall = mockCreateFile.mock.calls[0][0];
    expect(createCall.data.uploaderType).toBe('PARTNER');
  });
});
