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

function charCodesPreview(value: string, count = 12) {
  return Array.from(value.slice(0, count)).map((char) => char.charCodeAt(0));
}

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL ?? '').trim();
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  ).trim();
  const bucket = String(process.env.SUPABASE_STORAGE_BUCKET ?? '').trim();

  return { url, serviceRoleKey, bucket };
}

function createSupabaseClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function removeIfUploaded(
  client: ReturnType<typeof createSupabaseClient>,
  bucket: string,
  path: string | null
) {
  if (!path) return;

  try {
    await client.storage.from(bucket).remove([path]);
  } catch {
    // Debug endpoint: ignore cleanup errors.
  }
}

export async function POST() {
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

  const { url, serviceRoleKey, bucket } = getSupabaseConfig();
  const client = createSupabaseClient();
  const body = new Uint8Array([104, 105]);
  const timestamp = Date.now();

  const test1Path = `test-${timestamp}.txt`;
  const test2Path = `cases/test/test-${timestamp}.txt`;

  const result: {
    ok: boolean;
    config: {
      bucket: string | null;
      bucketSet: boolean;
      bucketLength: number;
      bucketCharCodes: number[];
      bucketIsEmpty: boolean;
      supabaseUrlSet: boolean;
      supabaseUrlHost: string | null;
      serviceRoleKeySet: boolean;
      serviceRoleKeyLength: number;
      serviceRoleKeyLooksJwt: boolean;
      serviceRoleKeyPreview: string | null;
    };
    tests: Array<{
      name: string;
      path: string;
      pathLength: number;
      pathCharCodes: number[];
      pathIsEmpty: boolean;
      pathStartsWithSlash: boolean;
      pathHasDoubleSlash: boolean;
      pathStartsWithSupabasePrefix: boolean;
      pathStartsWithLocalPrefix: boolean;
      ok: boolean;
      error?: string;
      fullPath?: string | null;
    }>;
  } = {
    ok: true,
    config: {
      bucket: bucket || null,
      bucketSet: Boolean(bucket),
      bucketLength: bucket.length,
      bucketCharCodes: charCodesPreview(bucket),
      bucketIsEmpty: bucket.length === 0,
      supabaseUrlSet: Boolean(url),
      supabaseUrlHost: (() => {
        try {
          return url ? new URL(url).hostname : null;
        } catch {
          return null;
        }
      })(),
      serviceRoleKeySet: Boolean(serviceRoleKey),
      serviceRoleKeyLength: serviceRoleKey.length,
      serviceRoleKeyLooksJwt: serviceRoleKey.split('.').length === 3,
      serviceRoleKeyPreview: maskValue(serviceRoleKey)
    },
    tests: []
  };

  let uploaded1: string | null = null;
  let uploaded2: string | null = null;

  try {
    console.info('[storage-upload-test:test1]', {
      bucket,
      path: test1Path,
      pathLength: test1Path.length,
      pathCharCodes: charCodesPreview(test1Path),
      pathIsEmpty: test1Path.length === 0
    });

    const res1 = await client.storage.from(bucket).upload(test1Path, body, {
      cacheControl: '3600',
      contentType: 'text/plain',
      upsert: true
    });

    if (res1.error) {
      result.ok = false;
      result.tests.push({
        name: 'test1',
        path: test1Path,
        pathLength: test1Path.length,
        pathCharCodes: charCodesPreview(test1Path),
        pathIsEmpty: false,
        pathStartsWithSlash: test1Path.startsWith('/'),
        pathHasDoubleSlash: test1Path.includes('//'),
        pathStartsWithSupabasePrefix: test1Path.startsWith('supabase:'),
        pathStartsWithLocalPrefix: test1Path.startsWith('local:'),
        ok: false,
        error: res1.error.message
      });
      return NextResponse.json(result, { status: 500 });
    }

    uploaded1 = res1.data?.path ?? test1Path;
    result.tests.push({
      name: 'test1',
      path: test1Path,
      pathLength: test1Path.length,
      pathCharCodes: charCodesPreview(test1Path),
      pathIsEmpty: false,
      pathStartsWithSlash: test1Path.startsWith('/'),
      pathHasDoubleSlash: test1Path.includes('//'),
      pathStartsWithSupabasePrefix: test1Path.startsWith('supabase:'),
      pathStartsWithLocalPrefix: test1Path.startsWith('local:'),
      ok: true,
      fullPath: res1.data?.fullPath ?? null
    });

    console.info('[storage-upload-test:test2]', {
      bucket,
      path: test2Path,
      pathLength: test2Path.length,
      pathCharCodes: charCodesPreview(test2Path),
      pathIsEmpty: test2Path.length === 0
    });

    const res2 = await client.storage.from(bucket).upload(test2Path, body, {
      cacheControl: '3600',
      contentType: 'text/plain',
      upsert: true
    });

    if (res2.error) {
      result.ok = false;
      result.tests.push({
        name: 'test2',
        path: test2Path,
        pathLength: test2Path.length,
        pathCharCodes: charCodesPreview(test2Path),
        pathIsEmpty: false,
        pathStartsWithSlash: test2Path.startsWith('/'),
        pathHasDoubleSlash: test2Path.includes('//'),
        pathStartsWithSupabasePrefix: test2Path.startsWith('supabase:'),
        pathStartsWithLocalPrefix: test2Path.startsWith('local:'),
        ok: false,
        error: res2.error.message
      });
      return NextResponse.json(result, { status: 500 });
    }

    uploaded2 = res2.data?.path ?? test2Path;
    result.tests.push({
      name: 'test2',
      path: test2Path,
      pathLength: test2Path.length,
      pathCharCodes: charCodesPreview(test2Path),
      pathIsEmpty: false,
      pathStartsWithSlash: test2Path.startsWith('/'),
      pathHasDoubleSlash: test2Path.includes('//'),
      pathStartsWithSupabasePrefix: test2Path.startsWith('supabase:'),
      pathStartsWithLocalPrefix: test2Path.startsWith('local:'),
      ok: true,
      fullPath: res2.data?.fullPath ?? null
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const message = String(error?.message ?? error).slice(0, 300);
    result.ok = false;
    result.tests.push({
      name: uploaded1 ? 'test2' : 'test1',
      path: uploaded1 ? test2Path : test1Path,
      pathLength: (uploaded1 ? test2Path : test1Path).length,
      pathCharCodes: charCodesPreview(uploaded1 ? test2Path : test1Path),
      pathIsEmpty: false,
      pathStartsWithSlash: (uploaded1 ? test2Path : test1Path).startsWith('/'),
      pathHasDoubleSlash: (uploaded1 ? test2Path : test1Path).includes('//'),
      pathStartsWithSupabasePrefix: (uploaded1
        ? test2Path
        : test1Path
      ).startsWith('supabase:'),
      pathStartsWithLocalPrefix: (uploaded1 ? test2Path : test1Path).startsWith(
        'local:'
      ),
      ok: false,
      error: message
    });
    return NextResponse.json(result, { status: 500 });
  } finally {
    await removeIfUploaded(client, bucket, uploaded2);
    await removeIfUploaded(client, bucket, uploaded1);
  }
}
