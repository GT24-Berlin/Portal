import 'server-only';
import {
  encryptCalendarToken,
  decryptCalendarToken
} from '@/lib/calendar-crypto';

const MS_TENANT = process.env.MICROSOFT_TENANT_ID ?? 'common';
const MS_TOKEN_URL = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`;
const MS_AUTH_URL = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`;
const MS_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export function getMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI ?? '',
    response_type: 'code',
    scope: 'Calendars.ReadWrite offline_access User.Read',
    response_mode: 'query',
    state
  });
  return `${MS_AUTH_URL}?${params}`;
}

export async function exchangeMicrosoftCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI ?? '',
      grant_type: 'authorization_code',
      scope: 'Calendars.ReadWrite offline_access User.Read'
    })
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || data.error) {
    throw new Error(
      String(
        data.error_description ??
          data.error ??
          'Microsoft token exchange failed'
      )
    );
  }

  const profileRes = await fetch(
    `${MS_GRAPH_BASE}/me?$select=mail,userPrincipalName`,
    { headers: { Authorization: `Bearer ${String(data.access_token)}` } }
  );
  const profile = (await profileRes.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return {
    accessToken: encryptCalendarToken(String(data.access_token)),
    refreshToken: encryptCalendarToken(String(data.refresh_token ?? '')),
    expiresAt: new Date(Date.now() + Number(data.expires_in ?? 3600) * 1000),
    email: String(profile.mail ?? profile.userPrincipalName ?? '')
  };
}

export async function refreshMicrosoftToken(
  encryptedRefreshToken: string
): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const refreshToken = decryptCalendarToken(encryptedRefreshToken);
  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      scope: 'Calendars.ReadWrite offline_access User.Read'
    })
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || data.error) {
    throw new Error(
      String(data.error_description ?? 'Microsoft token refresh failed')
    );
  }
  return {
    accessToken: encryptCalendarToken(String(data.access_token)),
    expiresAt: new Date(Date.now() + Number(data.expires_in ?? 3600) * 1000)
  };
}

export async function createMicrosoftCalendarEvent(
  accessToken: string,
  payload: object
): Promise<string> {
  const res = await fetch(`${MS_GRAPH_BASE}/me/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = (data.error as Record<string, unknown>)?.message;
    throw new Error(String(errMsg ?? 'Microsoft create event failed'));
  }
  return String(data.id);
}

export async function deleteMicrosoftCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `${MS_GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Microsoft delete event failed: ${res.status}`);
  }
}
