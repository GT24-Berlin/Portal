import 'server-only';

import { promises as fs } from 'node:fs';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

import type {
  OpenStoredFileResult,
  PutStoredFileInput,
  PutStoredFileResult,
  StorageProvider
} from './types';

const LOCAL_PREFIX = 'local:';

function isProductionStorageContext() {
  return process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production';
}

function getUploadRoot() {
  return path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR ?? 'uploads');
}

function sanitizePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function sanitizeFolder(folder: string) {
  return folder
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map(sanitizePart)
    .join('/');
}

function sanitizeFilename(filename: string) {
  const lastPart = filename.split('/').pop()?.split('\\').pop() ?? 'upload.bin';
  const clean = lastPart.replace(/[^a-zA-Z0-9._-]/g, '-');
  return clean || 'upload.bin';
}

function resolveLocalPath(storageKey: string) {
  if (isProductionStorageContext()) {
    throw new Error(
      `Local storage is disabled in Production. storageKey "${storageKey}" must be migrated to Supabase.`
    );
  }

  if (!storageKey.startsWith(LOCAL_PREFIX)) {
    throw new Error(`Unsupported local storageKey: ${storageKey}`);
  }

  const relativePath = storageKey.slice(LOCAL_PREFIX.length);
  const root = getUploadRoot();
  const absolutePath = path.resolve(root, relativePath);

  if (absolutePath !== root && !absolutePath.startsWith(root + path.sep)) {
    throw new Error('Invalid local storage path');
  }

  return absolutePath;
}

export const localStorageProvider: StorageProvider = {
  async put(input: PutStoredFileInput): Promise<PutStoredFileResult> {
    if (isProductionStorageContext()) {
      throw new Error('Local storage is disabled in Production.');
    }

    const folder = sanitizeFolder(input.folder ?? 'case-files');
    const originalFilename = sanitizeFilename(input.file.name || 'upload.bin');
    const extension = path.extname(originalFilename).toLowerCase();
    const generatedName = `${crypto.randomBytes(16).toString('hex')}${extension}`;

    const relativePath = folder ? `${folder}/${generatedName}` : generatedName;
    const absolutePath = path.resolve(getUploadRoot(), relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    const buffer = Buffer.from(await input.file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);

    return {
      storageKey: `${LOCAL_PREFIX}${relativePath}`,
      size: input.file.size,
      mimeType: input.file.type || 'application/octet-stream',
      originalFilename
    };
  },

  async open(storageKey: string): Promise<OpenStoredFileResult> {
    const absolutePath = resolveLocalPath(storageKey);
    const stat = await fs.stat(absolutePath);
    const nodeStream = createReadStream(absolutePath);
    const body = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return {
      body,
      size: stat.size
    };
  },

  async readBuffer(storageKey: string): Promise<Buffer> {
    const absolutePath = resolveLocalPath(storageKey);
    return fs.readFile(absolutePath);
  }
};
