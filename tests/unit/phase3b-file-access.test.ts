/**
 * Phase 3B-2B — File Read/Download Access Tests
 *
 * Covers:
 *   LIST:     GET /api/cases/[id]/files
 *   DOWNLOAD: GET /api/cases/[id]/files/[fileId]/download
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must be top-level before any import) ──────────────────────

const mockRequireCaseAccess = vi.hoisted(() => vi.fn());
const mockRequireCaseFileAccess = vi.hoisted(() => vi.fn());
const mockRequireCaseAssignmentAccess = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreateStoredFileDownloadResponse = vi.hoisted(() => vi.fn());

vi.mock('@/lib/policy', () => ({
  requireCaseAccess: mockRequireCaseAccess,
  requireCaseFileAccess: mockRequireCaseFileAccess,
  requireCaseAssignmentAccess: mockRequireCaseAssignmentAccess
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    caseFile: {
      findMany: mockFindMany
    }
  }
}));

vi.mock('@/lib/storage', () => ({
  createStoredFileDownloadResponse: mockCreateStoredFileDownloadResponse
}));

// ── Route imports (after mocks) ───────────────────────────────────────────────

import { GET as LIST_GET } from '@/app/api/cases/[id]/files/route';
import { GET as DOWNLOAD_GET } from '@/app/api/cases/[id]/files/[fileId]/download/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInternalOrg() {
  return {
    id: 'org-internal',
    type: 'INTERNAL',
    status: 'ACTIVE',
    name: 'GT24 Internal'
  } as any;
}

function makeGutachterOrg() {
  return {
    id: 'org-gutachter',
    type: 'GUTACHTER',
    status: 'ACTIVE',
    name: 'Gutachter GmbH'
  } as any;
}

function internalAccessResult(caseId = 'case-1') {
  const org = makeInternalOrg();
  return {
    ok: true as const,
    clerkUserId: 'user_internal',
    memberships: [
      { id: 'm1', organizationId: org.id, organization: org } as any
    ],
    caseOrgs: [
      {
        id: 'co-1',
        caseId,
        organizationId: org.id,
        role: 'OWNER',
        organization: org
      } as any
    ]
  };
}

function partnerAccessResult(caseId = 'case-1') {
  const org = makeGutachterOrg();
  return {
    ok: true as const,
    clerkUserId: 'user_partner',
    memberships: [
      { id: 'm2', organizationId: org.id, organization: org } as any
    ],
    caseOrgs: [
      {
        id: 'co-2',
        caseId,
        organizationId: org.id,
        role: 'ASSIGNED',
        organization: org
      } as any
    ]
  };
}

function internalFileAccessResult(fileId = 'file-1', caseId = 'case-1') {
  const access = internalAccessResult(caseId);
  return {
    ...access,
    file: {
      id: fileId,
      caseId,
      storageKey: 'supabase:bucket/file-1.pdf',
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      size: 10240,
      visibility: 'INTERNAL_ONLY',
      category: 'REPORT',
      uploaderType: 'INTERNAL',
      uploaderId: 'user_internal',
      role: null
    } as any
  };
}

function partnerFileAccessResult(
  fileId = 'file-2',
  caseId = 'case-1',
  visibility = 'PARTNERS'
) {
  const access = partnerAccessResult(caseId);
  return {
    ...access,
    file: {
      id: fileId,
      caseId,
      storageKey: 'supabase:bucket/file-2.pdf',
      filename: 'gutachten.pdf',
      mimeType: 'application/pdf',
      size: 5120,
      visibility,
      category: 'GUTACHTEN',
      uploaderType: 'INTERNAL',
      uploaderId: 'user_internal',
      role: 'GUTACHTER'
    } as any
  };
}

function assignmentOk(caseId = 'case-1') {
  return {
    ok: true as const,
    clerkUserId: 'user_partner',
    assignment: {
      id: 'a1',
      caseId,
      role: 'GUTACHTER',
      assigneeClerkUserId: 'user_partner',
      status: 'ACCEPTED',
      active: true,
      activeKey: 'ACTIVE',
      expiresAt: new Date(Date.now() + 3600_000),
      assignedAt: new Date(),
      acceptedAt: new Date()
    } as any
  };
}

function sampleFiles() {
  return [
    {
      id: 'f1',
      filename: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 1000,
      createdAt: new Date(),
      uploaderType: 'INTERNAL',
      uploaderId: 'u1',
      role: null,
      visibility: 'INTERNAL_ONLY',
      category: 'REPORT',
      title: null
    }
  ];
}

async function callList(caseId: string) {
  const req = new Request(`http://localhost/api/cases/${caseId}/files`);
  const res = await LIST_GET(req, { params: Promise.resolve({ id: caseId }) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function callDownload(caseId: string, fileId: string) {
  const req = new Request(
    `http://localhost/api/cases/${caseId}/files/${fileId}/download`
  );
  const res = await DOWNLOAD_GET(req, {
    params: Promise.resolve({ id: caseId, fileId })
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ── LIST tests ────────────────────────────────────────────────────────────────

describe('GET /api/cases/[id]/files — LIST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue(sampleFiles());
  });

  it('returns 401 when requireCaseAccess returns 401', async () => {
    mockRequireCaseAccess.mockResolvedValue({ ok: false, status: 401 });
    const { status, body } = await callList('case-1');
    expect(status).toBe(401);
    expect(body.ok).toBe(false);
  });

  it('returns 404 when requireCaseAccess returns 404', async () => {
    mockRequireCaseAccess.mockResolvedValue({ ok: false, status: 404 });
    const { status, body } = await callList('case-1');
    expect(status).toBe(404);
    expect(body.ok).toBe(false);
  });

  it('returns 403 when requireCaseAccess returns 403', async () => {
    mockRequireCaseAccess.mockResolvedValue({ ok: false, status: 403 });
    const { status, body } = await callList('case-1');
    expect(status).toBe(403);
    expect(body.ok).toBe(false);
  });

  it('returns 400 when caseId is missing', async () => {
    const { status, body } = await callList('');
    expect(status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('INTERNAL user: returns 200 with files', async () => {
    mockRequireCaseAccess.mockResolvedValue(internalAccessResult());
    const { status, body } = await callList('case-1');
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.files)).toBe(true);
  });

  it('INTERNAL user: does not call requireCaseAssignmentAccess', async () => {
    mockRequireCaseAccess.mockResolvedValue(internalAccessResult());
    await callList('case-1');
    expect(mockRequireCaseAssignmentAccess).not.toHaveBeenCalled();
  });

  it('INTERNAL user: queries with no visibility filter', async () => {
    mockRequireCaseAccess.mockResolvedValue(internalAccessResult());
    await callList('case-1');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.visibility).toBeUndefined();
  });

  it('INTERNAL user: storageKey absent from response files', async () => {
    mockRequireCaseAccess.mockResolvedValue(internalAccessResult());
    mockFindMany.mockResolvedValue([
      {
        id: 'f1',
        filename: 'x.pdf',
        mimeType: 'application/pdf',
        size: 1,
        createdAt: new Date(),
        uploaderType: 'INTERNAL',
        uploaderId: 'u1',
        role: null,
        visibility: 'INTERNAL_ONLY',
        category: 'REPORT',
        title: null
      }
    ]);
    const { body } = await callList('case-1');
    for (const f of body.files) {
      expect(f).not.toHaveProperty('storageKey');
    }
  });

  it('partner user: returns 403 when requireCaseAssignmentAccess returns 404', async () => {
    mockRequireCaseAccess.mockResolvedValue(partnerAccessResult());
    mockRequireCaseAssignmentAccess.mockResolvedValue({
      ok: false,
      status: 404
    });
    const { status, body } = await callList('case-1');
    expect(status).toBe(403);
    expect(body.ok).toBe(false);
  });

  it('partner user: returns 403 when requireCaseAssignmentAccess returns 401', async () => {
    mockRequireCaseAccess.mockResolvedValue(partnerAccessResult());
    mockRequireCaseAssignmentAccess.mockResolvedValue({
      ok: false,
      status: 401
    });
    const { status, body } = await callList('case-1');
    expect(status).toBe(403);
    expect(body.ok).toBe(false);
  });

  it('partner user: calls requireCaseAssignmentAccess with correct caseId', async () => {
    mockRequireCaseAccess.mockResolvedValue(partnerAccessResult());
    mockRequireCaseAssignmentAccess.mockResolvedValue(assignmentOk());
    await callList('case-42');
    expect(mockRequireCaseAssignmentAccess).toHaveBeenCalledWith('case-42');
  });

  it('partner user: queries with visibility filter [CUSTOMER, CUSTOMER_AND_PARTNERS, PARTNERS]', async () => {
    mockRequireCaseAccess.mockResolvedValue(partnerAccessResult());
    mockRequireCaseAssignmentAccess.mockResolvedValue(assignmentOk());
    mockFindMany.mockResolvedValue([]);
    await callList('case-1');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where.visibility?.in).toEqual(
      expect.arrayContaining(['CUSTOMER', 'CUSTOMER_AND_PARTNERS', 'PARTNERS'])
    );
    expect(call.where.visibility?.in).toHaveLength(3);
  });

  it('partner user: storageKey absent from response files', async () => {
    mockRequireCaseAccess.mockResolvedValue(partnerAccessResult());
    mockRequireCaseAssignmentAccess.mockResolvedValue(assignmentOk());
    mockFindMany.mockResolvedValue([
      {
        id: 'f2',
        filename: 'y.pdf',
        mimeType: 'application/pdf',
        size: 2,
        createdAt: new Date(),
        uploaderType: 'INTERNAL',
        uploaderId: 'u1',
        role: 'GUTACHTER',
        visibility: 'PARTNERS',
        category: 'GUTACHTEN',
        title: null
      }
    ]);
    const { body } = await callList('case-1');
    for (const f of body.files) {
      expect(f).not.toHaveProperty('storageKey');
    }
  });

  it('returns 500 on unhandled error', async () => {
    mockRequireCaseAccess.mockRejectedValue(new Error('DB down'));
    const { status, body } = await callList('case-1');
    expect(status).toBe(500);
    expect(body.ok).toBe(false);
  });
});

// ── DOWNLOAD tests ────────────────────────────────────────────────────────────

describe('GET /api/cases/[id]/files/[fileId]/download — DOWNLOAD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateStoredFileDownloadResponse.mockResolvedValue(
      new Response('pdf-data', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' }
      })
    );
  });

  it('returns 401 when requireCaseFileAccess returns 401', async () => {
    mockRequireCaseFileAccess.mockResolvedValue({ ok: false, status: 401 });
    const { status } = await callDownload('case-1', 'file-1');
    expect(status).toBe(401);
  });

  it('returns 404 when requireCaseFileAccess returns 404', async () => {
    mockRequireCaseFileAccess.mockResolvedValue({ ok: false, status: 404 });
    const { status } = await callDownload('case-1', 'file-1');
    expect(status).toBe(404);
  });

  it('returns 404 when requireCaseFileAccess returns 403', async () => {
    mockRequireCaseFileAccess.mockResolvedValue({ ok: false, status: 403 });
    const { status } = await callDownload('case-1', 'file-1');
    expect(status).toBe(404);
  });

  it('returns 400 when fileId is missing', async () => {
    const req = new Request(
      'http://localhost/api/cases/case-1/files//download'
    );
    const res = await DOWNLOAD_GET(req, {
      params: Promise.resolve({ id: 'case-1', fileId: '' })
    });
    expect(res.status).toBe(400);
  });

  it('INTERNAL user: returns 200 download response', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(internalFileAccessResult());
    const { status } = await callDownload('case-1', 'file-1');
    expect(status).toBe(200);
  });

  it('INTERNAL user: does not call requireCaseAssignmentAccess', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(internalFileAccessResult());
    await callDownload('case-1', 'file-1');
    expect(mockRequireCaseAssignmentAccess).not.toHaveBeenCalled();
  });

  it('INTERNAL user: can download INTERNAL_ONLY visibility file', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(
      internalFileAccessResult('file-1', 'case-1')
    );
    const { status } = await callDownload('case-1', 'file-1');
    expect(status).toBe(200);
    expect(mockCreateStoredFileDownloadResponse).toHaveBeenCalledWith(
      expect.objectContaining({ storageKey: 'supabase:bucket/file-1.pdf' })
    );
  });

  it('partner user: returns 403 when requireCaseAssignmentAccess fails', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(
      partnerFileAccessResult('file-2', 'case-1', 'PARTNERS')
    );
    mockRequireCaseAssignmentAccess.mockResolvedValue({
      ok: false,
      status: 404
    });
    const { status } = await callDownload('case-1', 'file-2');
    expect(status).toBe(403);
  });

  it('partner user: 404 when file visibility is CUSTOMER (not downloadable)', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(
      partnerFileAccessResult('file-3', 'case-1', 'CUSTOMER')
    );
    mockRequireCaseAssignmentAccess.mockResolvedValue(assignmentOk());
    const { status } = await callDownload('case-1', 'file-3');
    expect(status).toBe(404);
  });

  it('partner user: 404 when file visibility is INTERNAL_ONLY', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(
      partnerFileAccessResult('file-4', 'case-1', 'INTERNAL_ONLY')
    );
    mockRequireCaseAssignmentAccess.mockResolvedValue(assignmentOk());
    const { status } = await callDownload('case-1', 'file-4');
    expect(status).toBe(404);
  });

  it('partner user: downloads PARTNERS-visibility file successfully', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(
      partnerFileAccessResult('file-2', 'case-1', 'PARTNERS')
    );
    mockRequireCaseAssignmentAccess.mockResolvedValue(assignmentOk());
    const { status } = await callDownload('case-1', 'file-2');
    expect(status).toBe(200);
  });

  it('partner user: downloads CUSTOMER_AND_PARTNERS-visibility file successfully', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(
      partnerFileAccessResult('file-5', 'case-1', 'CUSTOMER_AND_PARTNERS')
    );
    mockRequireCaseAssignmentAccess.mockResolvedValue(assignmentOk());
    const { status } = await callDownload('case-1', 'file-5');
    expect(status).toBe(200);
  });

  it('returns 500 on unhandled error', async () => {
    mockRequireCaseFileAccess.mockRejectedValue(
      new Error('storage unavailable')
    );
    const { status } = await callDownload('case-1', 'file-1');
    expect(status).toBe(500);
  });
});

// ── Structure checks ──────────────────────────────────────────────────────────

describe('Structure invariants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('LIST: requireCaseAccess is called with the route caseId', async () => {
    mockRequireCaseAccess.mockResolvedValue({ ok: false, status: 401 });
    await callList('case-xyz');
    expect(mockRequireCaseAccess).toHaveBeenCalledWith('case-xyz');
  });

  it('DOWNLOAD: requireCaseFileAccess is called with fileId then caseId', async () => {
    mockRequireCaseFileAccess.mockResolvedValue({ ok: false, status: 401 });
    await callDownload('case-abc', 'file-def');
    expect(mockRequireCaseFileAccess).toHaveBeenCalledWith(
      'file-def',
      'case-abc'
    );
  });

  it('LIST: select passed to findMany has no storageKey field', async () => {
    mockRequireCaseAccess.mockResolvedValue(internalAccessResult());
    mockFindMany.mockResolvedValue([]);
    await callList('case-1');
    const call = mockFindMany.mock.calls[0][0];
    expect(call.select).not.toHaveProperty('storageKey');
  });

  it('DOWNLOAD: createStoredFileDownloadResponse receives storageKey from policy, not from prisma', async () => {
    mockRequireCaseFileAccess.mockResolvedValue(internalFileAccessResult());
    await callDownload('case-1', 'file-1');
    expect(mockCreateStoredFileDownloadResponse).toHaveBeenCalledWith(
      expect.objectContaining({ storageKey: 'supabase:bucket/file-1.pdf' })
    );
    // prisma.caseFile.findMany should NOT be called in download route
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
