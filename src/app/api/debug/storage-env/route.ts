import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function maskValue(value: string | null | undefined) {
  const v = String(value ?? '');
  if (!v) return null;
  if (v.length <= 12) return `${v.slice(0, 6)}...${v.slice(-6)}`;
  return `${v.slice(0, 6)}...${v.slice(-6)}`;
}

function decodeJwtPayload(segment: string) {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '='
    );
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);

    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function pickSafeJwtFields(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;

  const record = payload as Record<string, unknown>;
  const safe: Record<string, unknown> = {};

  for (const key of ['role', 'iss', 'ref', 'project_ref', 'exp'] as const) {
    if (key in record) safe[key] = record[key];
  }

  return safe;
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
      },
      { status: guard.status }
    );
  }

  const supabaseUrl = String(process.env.SUPABASE_URL ?? '').trim();
  const storageBucket = String(
    process.env.SUPABASE_STORAGE_BUCKET ?? ''
  ).trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  ).trim();

  const parsedUrl = (() => {
    try {
      return supabaseUrl ? new URL(supabaseUrl) : null;
    } catch {
      return null;
    }
  })();

  const keyParts = serviceRoleKey ? serviceRoleKey.split('.') : [];
  const isJwtLike = keyParts.length === 3;
  const jwtPayload = isJwtLike ? decodeJwtPayload(keyParts[1]) : null;

  const debugClient =
    supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        })
      : null;

  let bucketSelfTest:
    | {
        ok: true;
        objectCount: number | null;
      }
    | {
        ok: false;
        error: string;
      }
    | null = null;

  if (debugClient && storageBucket) {
    try {
      const result = await debugClient.storage.from(storageBucket).list('', {
        limit: 1
      });

      bucketSelfTest = {
        ok: true,
        objectCount: Array.isArray(result.data) ? result.data.length : null
      };
    } catch (error: any) {
      bucketSelfTest = {
        ok: false,
        error: String(error?.message ?? error).slice(0, 240)
      };
    }
  }

  return NextResponse.json({
    ok: true,
    supabase: {
      urlSet: Boolean(supabaseUrl),
      urlHost: parsedUrl?.hostname ?? null,
      bucketSet: Boolean(storageBucket),
      bucket: storageBucket || null,
      serviceRoleKeySet: Boolean(serviceRoleKey),
      serviceRoleKeyLength: serviceRoleKey.length || 0,
      serviceRoleKeyLooksJwt: isJwtLike,
      serviceRoleKeyPreview: maskValue(serviceRoleKey),
      jwtPayload: pickSafeJwtFields(jwtPayload)
    },
    storageSelfTest: bucketSelfTest
  });
}
