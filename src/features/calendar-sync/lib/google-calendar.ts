import 'server-only';
import {
  encryptCalendarToken,
  decryptCalendarToken
} from '@/lib/calendar-crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_ID = 'primary';

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? '',
      grant_type: 'authorization_code'
    })
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || data.error) {
    throw new Error(
      String(
        data.error_description ?? data.error ?? 'Google token exchange failed'
      )
    );
  }

  const profileRes = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: { Authorization: `Bearer ${String(data.access_token)}` }
    }
  );
  const profile = (await profileRes.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return {
    accessToken: encryptCalendarToken(String(data.access_token)),
    refreshToken: encryptCalendarToken(String(data.refresh_token ?? '')),
    expiresAt: new Date(Date.now() + Number(data.expires_in ?? 3600) * 1000),
    email: String(profile.email ?? '')
  };
}

export async function refreshGoogleToken(
  encryptedRefreshToken: string
): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const refreshToken = decryptCalendarToken(encryptedRefreshToken);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token'
    })
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || data.error) {
    throw new Error(
      String(data.error_description ?? 'Google token refresh failed')
    );
  }
  return {
    accessToken: encryptCalendarToken(String(data.access_token)),
    expiresAt: new Date(Date.now() + Number(data.expires_in ?? 3600) * 1000)
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  payload: object
): Promise<string> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${CALENDAR_ID}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errMsg = (data.error as Record<string, unknown>)?.message;
    throw new Error(String(errMsg ?? 'Google create event failed'));
  }
  return String(data.id);
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${CALENDAR_ID}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  // 404/410 = already gone — treat as success
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google delete event failed: ${res.status}`);
  }
}
