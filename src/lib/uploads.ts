import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export function safeExt(filename: string) {
  const ext = path.extname(filename || '').toLowerCase();
  // Whitelist (MVP): Bilder + PDF
  const ok = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  return ok.includes(ext) ? ext : '';
}

export function randomName(ext: string) {
  return `${crypto.randomBytes(16).toString('hex')}${ext}`;
}

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function writeUploadFile(
  buffer: Buffer,
  originalFilename: string
) {
  await ensureUploadDir();

  const ext = safeExt(originalFilename);
  if (!ext) {
    throw new Error('unsupported_file_type');
  }

  const storedName = randomName(ext);
  const absPath = path.join(UPLOAD_DIR, storedName);

  await fs.writeFile(absPath, buffer);

  const mimeType =
    ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';

  return {
    // ✅ DB-friendly
    storageKey: `local:${storedName}`,
    filename: originalFilename,
    mimeType,
    size: buffer.length,

    // optional debug (falls du es loggen willst)
    absPath,
    storedName
  };
}
