import crypto from 'crypto';

const TOKEN_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function isTokenCollisionError(error: unknown) {
  const candidate = error as {
    code?: string;
    meta?: { target?: unknown };
  } | null;

  return (
    candidate?.code === 'P2002' &&
    Array.isArray(candidate.meta?.target) &&
    candidate.meta?.target.includes('token')
  );
}

export function generateCaseToken(length = 16) {
  const bytes = crypto.randomBytes(length * 2);
  const chars: string[] = [];
  const maxMultiple =
    Math.floor(256 / TOKEN_ALPHABET.length) * TOKEN_ALPHABET.length;

  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index];
    if (byte >= maxMultiple) continue;
    chars.push(TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]);
    if (chars.length === length) break;
  }

  if (chars.length < length) {
    return generateCaseToken(length);
  }

  return chars.join('');
}

export async function createCaseWithUniqueToken<T>(
  create: (token: string) => Promise<T>,
  maxRetries = 5
) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const token = generateCaseToken();

    try {
      return await create(token);
    } catch (error) {
      if (isTokenCollisionError(error)) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error('Failed to generate a unique case token');
}
