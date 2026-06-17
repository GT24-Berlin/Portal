import 'server-only';
import { prisma } from '@/lib/prisma';
import { decryptCalendarToken } from '@/lib/calendar-crypto';
import { refreshGoogleToken } from './google-calendar';
import { refreshMicrosoftToken } from './microsoft-calendar';

type ConnectionLike = {
  id: string;
  provider: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

/**
 * Returns a decrypted, valid access token for the given connection.
 * Automatically refreshes expired Google/Microsoft tokens and persists the
 * new encrypted value.
 * For APPLE, returns the encrypted credentials string (caller handles it).
 */
export async function getValidAccessToken(
  connection: ConnectionLike
): Promise<string> {
  if (!connection.accessToken) {
    throw new Error(
      `[token-manager] No access token for connection ${connection.id}`
    );
  }

  // Apple: no OAuth expiry — return the raw encrypted creds string
  if (connection.provider === 'APPLE') {
    return connection.accessToken;
  }

  // Buffer: refresh 5 minutes before actual expiry
  const BUFFER_MS = 5 * 60 * 1000;
  const isExpired =
    connection.tokenExpiresAt != null &&
    connection.tokenExpiresAt.getTime() - BUFFER_MS < Date.now();

  if (!isExpired) {
    return decryptCalendarToken(connection.accessToken);
  }

  if (!connection.refreshToken) {
    throw new Error(
      `[token-manager] Token expired and no refresh token — re-connect required (${connection.id})`
    );
  }

  let newEncryptedAccess: string;
  let newExpiresAt: Date;

  if (connection.provider === 'GOOGLE') {
    const refreshed = await refreshGoogleToken(connection.refreshToken);
    newEncryptedAccess = refreshed.accessToken;
    newExpiresAt = refreshed.expiresAt;
  } else if (connection.provider === 'MICROSOFT') {
    const refreshed = await refreshMicrosoftToken(connection.refreshToken);
    newEncryptedAccess = refreshed.accessToken;
    newExpiresAt = refreshed.expiresAt;
  } else {
    throw new Error(`[token-manager] Unknown provider: ${connection.provider}`);
  }

  // Persist refreshed token
  await prisma.partnerCalendarConnection.update({
    where: { id: connection.id },
    data: { accessToken: newEncryptedAccess, tokenExpiresAt: newExpiresAt }
  });

  return decryptCalendarToken(newEncryptedAccess);
}
