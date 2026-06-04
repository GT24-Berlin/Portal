import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/rbac';
import { createRequire } from 'node:module';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const require = createRequire(import.meta.url);
const SUPABASE_JS_VERSION = require('@supabase/supabase-js/package.json')
  .version as string;
const STORAGE_JS_VERSION = require('@supabase/storage-js/package.json')
  .version as string;

function maskValue(value: string | null | undefined) {
  const v = String(value ?? '');
  if (!v) return null;
  if (v.length <= 12) return `${v.slice(0, 6)}...${v.slice(-6)}`;
  return `${v.slice(0, 6)}...${v.slice(-6)}`;
}

function charCodesPreview(value: string, count = 12) {
  return Array.from(value.slice(0, count)).map((char) => char.charCodeAt(0));
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
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

function buildStorageObjectUrl(
  supabaseUrl: string,
  bucket: string,
  path: string
) {
  const base = new URL(ensureTrailingSlash(supabaseUrl));
  return new URL(
    `storage/v1/object/${encodeURIComponent(bucket)}/${path}`,
    base
  ).toString();
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
      supabaseJsVersion: string;
      storageJsVersion: string;
      supabaseUrlRaw: string | null;
      supabaseUrlLength: number;
      supabaseUrlLastChar: string | null;
      supabaseUrlLastCharCode: number | null;
      supabaseUrlEndsWithSlash: boolean;
      supabaseUrlHasPathSuffix: boolean;
      supabaseUrlPathname: string | null;
    };
    storageListTest: {
      ok: boolean;
      data: unknown[] | null;
      dataIsNull: boolean;
      error: {
        message: string;
        name: string | null;
      } | null;
    } | null;
    rawFetchTest: {
      ok: boolean;
      url: string;
      status: number | null;
      responseBodyText: string | null;
      responseBodyJson: unknown | null;
      error?: string;
    } | null;
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
      supabaseUrlRaw: url || null,
      supabaseUrlLength: url.length,
      supabaseUrlLastChar: url ? url.slice(-1) : null,
      supabaseUrlLastCharCode: url ? url.charCodeAt(url.length - 1) : null,
      supabaseUrlEndsWithSlash: url.endsWith('/'),
      supabaseUrlHasPathSuffix: (() => {
        try {
          const parsed = url ? new URL(url) : null;
          return Boolean(parsed && parsed.pathname && parsed.pathname !== '/');
        } catch {
          return false;
        }
      })(),
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
      serviceRoleKeyPreview: maskValue(serviceRoleKey),
      supabaseJsVersion: SUPABASE_JS_VERSION,
      storageJsVersion: STORAGE_JS_VERSION,
      supabaseUrlPathname: (() => {
        try {
          return url ? new URL(url).pathname : null;
        } catch {
          return null;
        }
      })()
    },
    storageListTest: null,
    rawFetchTest: null,
    tests: []
  };

  let uploaded1: string | null = null;
  let uploaded2: string | null = null;
  let rawUploadedPath: string | null = null;

  try {
    const listResult = await client.storage.from(bucket).list('', { limit: 1 });
    result.storageListTest = {
      ok: !listResult.error,
      data: listResult.data ?? null,
      dataIsNull: listResult.data === null,
      error: listResult.error
        ? {
            message: listResult.error.message,
            name: listResult.error.name ?? null
          }
        : null
    };
    if (listResult.error) {
      result.ok = false;
    }

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

    const rawFetchPath = 'test-raw.txt';
    const rawFetchUrl = buildStorageObjectUrl(url, bucket, rawFetchPath);
    console.info('[storage-upload-test:raw-fetch]', {
      bucket,
      rawFetchUrl,
      rawFetchPath,
      rawFetchPathLength: rawFetchPath.length,
      rawFetchPathCharCodes: charCodesPreview(rawFetchPath),
      bucketLength: bucket.length,
      bucketCharCodes: charCodesPreview(bucket)
    });

    const rawResponse = await fetch(rawFetchUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'text/plain',
        'x-upsert': 'true'
      },
      body: 'hi'
    });

    const rawResponseText = await rawResponse.text();
    let rawResponseJson: unknown | null = null;
    try {
      rawResponseJson = rawResponseText ? JSON.parse(rawResponseText) : null;
    } catch {
      rawResponseJson = null;
    }

    result.rawFetchTest = {
      ok: rawResponse.ok,
      url: rawFetchUrl,
      status: rawResponse.status,
      responseBodyText: rawResponseText,
      responseBodyJson: rawResponseJson
    };

    if (rawResponse.ok) {
      rawUploadedPath = rawFetchPath;
    }

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
    await removeIfUploaded(client, bucket, rawUploadedPath);
    await removeIfUploaded(client, bucket, uploaded2);
    await removeIfUploaded(client, bucket, uploaded1);
  }
}
