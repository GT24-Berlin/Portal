import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type {
  OpenStoredFileResult,
  PutStoredFileInput,
  PutStoredFileResult,
  StorageProvider
} from './types';

const SUPABASE_PREFIX = 'supabase:';

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!url) {
    throw new Error('SUPABASE_URL fehlt');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt');
  }

  if (!bucket) {
    throw new Error('SUPABASE_STORAGE_BUCKET fehlt');
  }

  return { url, serviceRoleKey, bucket };
}

function getSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function sanitizeFolder(folder: string) {
  return folder
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '-'))
    .join('/');
}

function sanitizeFilename(filename: string) {
  const lastPart = filename.split('/').pop()?.split('\\').pop() ?? 'upload.bin';
  const clean = lastPart.replace(/[^a-zA-Z0-9._-]/g, '-');
  return clean || 'upload.bin';
}

function encodeStorageKey(objectPath: string) {
  return `${SUPABASE_PREFIX}${objectPath}`;
}

function decodeStorageKey(storageKey: string) {
  if (!storageKey.startsWith(SUPABASE_PREFIX)) {
    throw new Error(`Unsupported supabase storageKey: ${storageKey}`);
  }

  return storageKey.slice(SUPABASE_PREFIX.length);
}

export const supabaseStorageProvider: StorageProvider = {
  async put(input: PutStoredFileInput): Promise<PutStoredFileResult> {
    const { bucket } = getSupabaseConfig();
    const client = getSupabaseAdminClient();

    const folder = sanitizeFolder(input.folder ?? 'case-files');
    const originalFilename = sanitizeFilename(input.file.name || 'upload.bin');

    const extension = originalFilename.includes('.')
      ? `.${originalFilename.split('.').pop()}`.toLowerCase()
      : '';

    const uniqueName =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const objectPath = folder
      ? `${folder}/${uniqueName}${extension}`
      : `${uniqueName}${extension}`;

    const arrayBuffer = await input.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await client.storage
      .from(bucket)
      .upload(objectPath, buffer, {
        cacheControl: '3600',
        contentType: input.file.type || 'application/octet-stream',
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload fehlgeschlagen: ${error.message}`);
    }

    return {
      storageKey: encodeStorageKey(objectPath),
      size: input.file.size,
      mimeType: input.file.type || 'application/octet-stream',
      originalFilename
    };
  },

  async open(storageKey: string): Promise<OpenStoredFileResult> {
    const { bucket } = getSupabaseConfig();
    const client = getSupabaseAdminClient();

    const objectPath = decodeStorageKey(storageKey);

    const { data, error } = await client.storage
      .from(bucket)
      .download(objectPath);

    if (error || !data) {
      throw new Error(
        `Supabase download fehlgeschlagen: ${error?.message ?? 'unknown error'}`
      );
    }

    const arrayBuffer = await data.arrayBuffer();

    return {
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(arrayBuffer));
          controller.close();
        }
      }),
      size: arrayBuffer.byteLength
    };
  },

  async readBuffer(storageKey: string): Promise<Buffer> {
    const { bucket } = getSupabaseConfig();
    const client = getSupabaseAdminClient();

    const objectPath = decodeStorageKey(storageKey);

    const { data, error } = await client.storage
      .from(bucket)
      .download(objectPath);

    if (error || !data) {
      throw new Error(
        `Supabase readBuffer fehlgeschlagen: ${error?.message ?? 'unknown error'}`
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
};
