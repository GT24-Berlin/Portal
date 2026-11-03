/**
 * GT24 NEXT Phase 3B-1C — Dashboard membership gate tests
 *
 * Verifies that dashboard/layout.tsx gates all /dashboard/* routes by
 * DB-backed ACTIVE membership. Unauthenticated → sign-in. No membership
 * or inactive membership → /no-access. Active membership → passes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

vi.mock('server-only', () => ({}));

// ── Module-level mocks ────────────────────────────────────────────────────────

vi.mock('@/lib/policy', () => ({
  requireIdentity: vi.fn(),
  getActiveMemberships: vi.fn()
}));

// redirect throws like Next.js does — caught to assert the path
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  })
}));

vi.mock('next/headers', () => ({
  cookies: vi
    .fn()
    .mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) })
}));

// Mock all dashboard UI components so JSX render does not error in the allow path
vi.mock('@/components/kbar', () => ({ default: () => null }));
vi.mock('@/components/layout/app-sidebar', () => ({ default: () => null }));
vi.mock('@/components/layout/header', () => ({ default: () => null }));
vi.mock('@/components/layout/info-sidebar', () => ({
  InfoSidebar: () => null
}));
vi.mock('@/components/ui/infobar', () => ({
  InfobarProvider: ({ children }: { children: unknown }) => children
}));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: unknown }) => children,
  SidebarInset: ({ children }: { children: unknown }) => children
}));

// ── Paths ─────────────────────────────────────────────────────────────────────

const LAYOUT_PATH = path.resolve(
  __dirname,
  '../../src/app/dashboard/layout.tsx'
);
const NO_ACCESS_PATH = path.resolve(
  __dirname,
  '../../src/app/no-access/page.tsx'
);
const OVERVIEW_LAYOUT_PATH = path.resolve(
  __dirname,
  '../../src/app/dashboard/overview/layout.tsx'
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function activeMembership(override: Record<string, unknown> = {}) {
  return {
    id: 'mem-1',
    clerkUserId: 'user_test_admin',
    organizationId: 'org-gt24-internal',
    role: 'ADMIN',
    status: 'ACTIVE',
    organization: {
      id: 'org-gt24-internal',
      type: 'INTERNAL',
      status: 'ACTIVE'
    },
    ...override
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE: dashboard layout uses DB policy
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-1C dashboard gate: layout.tsx structure', () => {
  it('dashboard layout file exists', () => {
    expect(existsSync(LAYOUT_PATH)).toBe(true);
  });

  it('imports requireIdentity from @/lib/policy', () => {
    const content = readFileSync(LAYOUT_PATH, 'utf-8');
    expect(content).toContain('requireIdentity');
    expect(content).toContain("from '@/lib/policy'");
  });

  it('imports getActiveMemberships from @/lib/policy', () => {
    const content = readFileSync(LAYOUT_PATH, 'utf-8');
    expect(content).toContain('getActiveMemberships');
  });

  it('does NOT use publicMetadata', () => {
    const content = readFileSync(LAYOUT_PATH, 'utf-8');
    expect(content).not.toContain('publicMetadata');
  });

  it('does NOT import from @/lib/rbac', () => {
    const content = readFileSync(LAYOUT_PATH, 'utf-8');
    expect(content).not.toContain("from '@/lib/rbac'");
  });

  it('redirects to /no-access for no membership', () => {
    const content = readFileSync(LAYOUT_PATH, 'utf-8');
    expect(content).toContain("redirect('/no-access')");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE: /no-access page outside /dashboard
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-1C dashboard gate: /no-access page structure', () => {
  it('/no-access page exists outside /dashboard', () => {
    expect(existsSync(NO_ACCESS_PATH)).toBe(true);
    expect(NO_ACCESS_PATH).not.toContain('/dashboard/');
  });

  it('/no-access page does not contain a server-side redirect() call', () => {
    const content = readFileSync(NO_ACCESS_PATH, 'utf-8');
    // Must not import redirect from next/navigation (that would be server-side)
    // Client-side navigation (router.push) is acceptable but not used here
    expect(content).not.toMatch(/import.*redirect.*from 'next\/navigation'/);
    expect(content).not.toMatch(/redirect\(/);
  });

  it('/no-access page provides a sign-out mechanism', () => {
    const content = readFileSync(NO_ACCESS_PATH, 'utf-8');
    expect(content).toContain('SignOutButton');
  });

  it('/no-access page does not expose publicMetadata or membership details', () => {
    const content = readFileSync(NO_ACCESS_PATH, 'utf-8');
    expect(content).not.toContain('publicMetadata');
    expect(content).not.toContain('requireIdentity');
    expect(content).not.toContain('getActiveMemberships');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE: overview/layout.tsx unchanged
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-1C dashboard gate: overview/layout.tsx unchanged', () => {
  it('overview layout still uses requireRole from rbac.ts', () => {
    const content = readFileSync(OVERVIEW_LAYOUT_PATH, 'utf-8');
    expect(content).toContain("from '@/lib/rbac'");
    expect(content).toContain('requireRole');
  });

  it('overview layout does NOT import from @/lib/policy', () => {
    const content = readFileSync(OVERVIEW_LAYOUT_PATH, 'utf-8');
    expect(content).not.toContain("from '@/lib/policy'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL: authorization layer behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3B-1C dashboard gate: authorization behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('redirects to /auth/sign-in when unauthenticated (requireIdentity → 401)', async () => {
    const { requireIdentity } = await import('@/lib/policy');
    vi.mocked(requireIdentity).mockResolvedValue({ ok: false, status: 401 });
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT:/auth/sign-in'
    );
  });

  it('redirects to /no-access when authenticated user has no Membership', async () => {
    const { requireIdentity, getActiveMemberships } = await import(
      '@/lib/policy'
    );
    vi.mocked(requireIdentity).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_no_membership'
    });
    vi.mocked(getActiveMemberships).mockResolvedValue([]);
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT:/no-access'
    );
  });

  it('redirects to /no-access for INACTIVE membership (getActiveMemberships returns [])', async () => {
    // getActiveMemberships filters status=ACTIVE — INACTIVE never returned
    const { requireIdentity, getActiveMemberships } = await import(
      '@/lib/policy'
    );
    vi.mocked(requireIdentity).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_inactive'
    });
    vi.mocked(getActiveMemberships).mockResolvedValue([]);
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT:/no-access'
    );
  });

  it('redirects to /no-access for REVOKED membership (getActiveMemberships returns [])', async () => {
    const { requireIdentity, getActiveMemberships } = await import(
      '@/lib/policy'
    );
    vi.mocked(requireIdentity).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_revoked'
    });
    vi.mocked(getActiveMemberships).mockResolvedValue([]);
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT:/no-access'
    );
  });

  it('redirects to /no-access for SUSPENDED org (getActiveMemberships returns [])', async () => {
    // getActiveMemberships filters org.status=ACTIVE — SUSPENDED never returned
    const { requireIdentity, getActiveMemberships } = await import(
      '@/lib/policy'
    );
    vi.mocked(requireIdentity).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_suspended_org'
    });
    vi.mocked(getActiveMemberships).mockResolvedValue([]);
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT:/no-access'
    );
  });

  it('redirects to /no-access for Clerk ADMIN metadata but no DB membership', async () => {
    // Gate is DB-only — Clerk publicMetadata.role is not consulted
    const { requireIdentity, getActiveMemberships } = await import(
      '@/lib/policy'
    );
    vi.mocked(requireIdentity).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_clerk_admin_no_db'
    });
    vi.mocked(getActiveMemberships).mockResolvedValue([]);
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT:/no-access'
    );
  });

  it('passes (no redirect) for authenticated user with one ACTIVE membership', async () => {
    const { requireIdentity, getActiveMemberships } = await import(
      '@/lib/policy'
    );
    vi.mocked(requireIdentity).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_admin'
    });
    vi.mocked(getActiveMemberships).mockResolvedValue([
      activeMembership()
    ] as any);
    const { redirect } = await import('next/navigation');
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    // Layout renders (returns React element), no redirect thrown
    await DashboardLayout({ children: null });
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it('passes (no redirect) for user with multiple ACTIVE memberships', async () => {
    const { requireIdentity, getActiveMemberships } = await import(
      '@/lib/policy'
    );
    vi.mocked(requireIdentity).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_multi'
    });
    vi.mocked(getActiveMemberships).mockResolvedValue([
      activeMembership({ id: 'mem-1', organizationId: 'org-1' }),
      activeMembership({
        id: 'mem-2',
        organizationId: 'org-2',
        organization: { id: 'org-2', type: 'GUTACHTER', status: 'ACTIVE' }
      })
    ] as any);
    const { redirect } = await import('next/navigation');
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    await DashboardLayout({ children: null });
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it('calls getActiveMemberships with the clerkUserId from requireIdentity', async () => {
    const { requireIdentity, getActiveMemberships } = await import(
      '@/lib/policy'
    );
    vi.mocked(requireIdentity).mockResolvedValue({
      ok: true,
      clerkUserId: 'user_test_specific'
    });
    vi.mocked(getActiveMemberships).mockResolvedValue([
      activeMembership()
    ] as any);
    const { default: DashboardLayout } = await import('@/app/dashboard/layout');
    await DashboardLayout({ children: null });
    expect(vi.mocked(getActiveMemberships)).toHaveBeenCalledWith(
      'user_test_specific'
    );
  });

  it('no redirect loop: /no-access is outside /dashboard and does not redirect', () => {
    const noAccessContent = readFileSync(NO_ACCESS_PATH, 'utf-8');
    // /no-access has no server-side redirect — the chain is: /dashboard → /no-access (stops)
    expect(noAccessContent).not.toMatch(/redirect\(/);
  });
});
