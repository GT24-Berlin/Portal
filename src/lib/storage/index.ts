import 'server-only';

import { localStorageProvider } from './local';
import { supabaseStorageProvider } from './supabase';
import type {
  OpenStoredFileResult,
  PutStoredFileInput,
  PutStoredFileResult,
  StorageProvider
} from './types';

type DownloadableFile = {
  storageKey: string;
  filename: string;
  mimeType?: string | null;
  size?: number | null;
};

function getConfiguredProviderName() {
  return process.env.FILE_STORAGE_PROVIDER ?? 'local';
}

function getConfiguredProvider(): StorageProvider {
  switch (getConfiguredProviderName()) {
    case 'local':
      return localStorageProvider;
    case 'supabase':
      return supabaseStorageProvider;
    default:
      throw new Error(
        `FILE_STORAGE_PROVIDER "${getConfiguredProviderName()}" ist noch nicht implementiert.`
      );
  }
}

function getProviderForStorageKey(storageKey: string): StorageProvider {
  if (storageKey.startsWith('local:')) {
    return localStorageProvider;
  }

  if (storageKey.startsWith('supabase:')) {
    return supabaseStorageProvider;
  }

  throw new Error(`Unsupported storageKey "${storageKey}"`);
}

export async function putStoredFile(
  input: PutStoredFileInput
): Promise<PutStoredFileResult> {
  return getConfiguredProvider().put(input);
}

export async function openStoredFile(
  storageKey: string
): Promise<OpenStoredFileResult> {
  return getProviderForStorageKey(storageKey).open(storageKey);
}

export async function readStoredFileToBuffer(
  storageKey: string
): Promise<Buffer> {
  return getProviderForStorageKey(storageKey).readBuffer(storageKey);
}

export function buildContentDisposition(
  filename: string,
  kind: 'attachment' | 'inline' = 'attachment'
) {
  const safe = (filename || 'download.bin').replace(/[\r\n"]/g, '_');
  return `${kind}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export function buildDownloadHeaders(input: {
  filename: string;
  mimeType?: string | null;
  size?: number | null;
}) {
  const headers = new Headers();
  headers.set('Content-Type', input.mimeType || 'application/octet-stream');
  headers.set(
    'Content-Disposition',
    buildContentDisposition(input.filename, 'attachment')
  );
  headers.set('Cache-Control', 'private, no-store, max-age=0');

  if (typeof input.size === 'number' && Number.isFinite(input.size)) {
    headers.set('Content-Length', String(input.size));
  }

  return headers;
}

export async function createStoredFileDownloadResponse(file: DownloadableFile) {
  const stored = await openStoredFile(file.storageKey);

  return new Response(stored.body, {
    status: 200,
    headers: buildDownloadHeaders({
      filename: file.filename,
      mimeType: file.mimeType ?? 'application/octet-stream',
      size: stored.size ?? file.size ?? undefined
    })
  });
}
