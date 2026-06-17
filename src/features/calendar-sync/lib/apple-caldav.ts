import 'server-only';
import {
  encryptCalendarToken,
  decryptCalendarToken
} from '@/lib/calendar-crypto';

const CALDAV_BASE = 'https://caldav.icloud.com';
const WELL_KNOWN = `${CALDAV_BASE}/.well-known/caldav`;

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

function extractHref(xml: string): string | null {
  const m = xml.match(/<[^:>]*:?href[^>]*>([^<]+)<\/[^:>]*:?href>/i);
  return m ? m[1].trim() : null;
}

/** Discover the CalDAV calendar home for an iCloud account. */
export async function discoverAppleCalendarHome(
  username: string,
  appPassword: string
): Promise<string> {
  const authHeader = basicAuth(username, appPassword);

  // Step 1: PROPFIND .well-known/caldav → follow redirect → get principal href
  const step1Body = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop><D:current-user-principal/></D:prop>
</D:propfind>`;

  const res1 = await fetch(WELL_KNOWN, {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader,
      Depth: '0',
      'Content-Type': 'application/xml; charset=utf-8'
    },
    body: step1Body,
    redirect: 'follow'
  });

  if (res1.status === 401)
    throw new Error('Apple CalDAV: Zugangsdaten ungültig (401)');
  const text1 = await res1.text();
  const principalHref = extractHref(text1);
  if (!principalHref)
    throw new Error('Apple CalDAV: Principal-URL nicht gefunden');
  const principalUrl = principalHref.startsWith('http')
    ? principalHref
    : `${CALDAV_BASE}${principalHref}`;

  // Step 2: PROPFIND principal → get calendar-home-set href
  const step2Body = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><C:calendar-home-set/></D:prop>
</D:propfind>`;

  const res2 = await fetch(principalUrl, {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader,
      Depth: '0',
      'Content-Type': 'application/xml; charset=utf-8'
    },
    body: step2Body
  });

  const text2 = await res2.text();
  const homeHref = extractHref(text2);
  if (!homeHref) throw new Error('Apple CalDAV: Calendar-Home nicht gefunden');
  return homeHref.startsWith('http') ? homeHref : `${CALDAV_BASE}${homeHref}`;
}

/** Encrypt Apple credentials into a single string for DB storage. */
export function encryptAppleCredentials(
  username: string,
  appPassword: string
): string {
  return encryptCalendarToken(`${username}:::${appPassword}`);
}

/** Decrypt Apple credentials stored in DB. */
export function decryptAppleCredentials(encrypted: string): {
  username: string;
  appPassword: string;
} {
  const plain = decryptCalendarToken(encrypted);
  const sep = plain.indexOf(':::');
  if (sep === -1) throw new Error('Apple credentials format invalid');
  return { username: plain.slice(0, sep), appPassword: plain.slice(sep + 3) };
}

/** Create (PUT) a calendar event on iCloud CalDAV. Returns the event URL as ID. */
export async function createAppleCalendarEvent(
  encryptedCredentials: string,
  calendarHomeUrl: string,
  uid: string,
  icalString: string
): Promise<string> {
  const { username, appPassword } =
    decryptAppleCredentials(encryptedCredentials);
  const base = calendarHomeUrl.replace(/\/$/, '');
  // iCloud typically uses a "home" calendar subfolder
  const eventUrl = `${base}/home/${uid}.ics`;

  const res = await fetch(eventUrl, {
    method: 'PUT',
    headers: {
      Authorization: basicAuth(username, appPassword),
      'Content-Type': 'text/calendar; charset=utf-8',
      'If-None-Match': '*'
    },
    body: icalString
  });

  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`Apple CalDAV PUT failed: ${res.status}`);
  }
  return eventUrl;
}

/** Delete a calendar event from iCloud CalDAV. */
export async function deleteAppleCalendarEvent(
  encryptedCredentials: string,
  eventUrl: string
): Promise<void> {
  const { username, appPassword } =
    decryptAppleCredentials(encryptedCredentials);
  const res = await fetch(eventUrl, {
    method: 'DELETE',
    headers: { Authorization: basicAuth(username, appPassword) }
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Apple CalDAV DELETE failed: ${res.status}`);
  }
}
