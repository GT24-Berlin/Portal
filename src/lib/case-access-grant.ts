import 'server-only';
import crypto from 'node:crypto';

const DOMAIN = 'case-access-grant-v1';
const GRANT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const s = process.env.CASE_ACCESS_SECRET;
  if (!s || s.length < 64) {
    throw new Error(
      `[case-access-grant] CASE_ACCESS_SECRET ${s ? 'is too short (min 64 chars)' : 'is not set'}. SEC-003.`
    );
  }
  return s;
}

function buildMessage(
  caseId: string,
  customerId: string,
  iat: number,
  exp: number
): string {
  return `${DOMAIN}:${caseId}:${customerId}:${iat}:${exp}`;
}

export function mintCaseAccessGrant(
  caseId: string,
  customerId: string,
  now = Date.now()
): string {
  const iat = Math.floor(now / 1000);
  const exp = iat + GRANT_TTL_SECONDS;
  const sig = crypto
    .createHmac('sha256', getSecret())
    .update(buildMessage(caseId, customerId, iat, exp))
    .digest('hex');
  return `${caseId}.${customerId}.${iat}.${exp}.${sig}`;
}

export type GrantVerifyResult =
  | { ok: true; caseId: string; customerId: string; iat: number; exp: number }
  | {
      ok: false;
      reason:
        | 'malformed'
        | 'expired'
        | 'case_mismatch'
        | 'invalid_signature'
        | 'future_iat';
    };

export function verifyCaseAccessGrant(
  grantToken: string,
  expectedCaseId: string,
  now = Date.now()
): GrantVerifyResult {
  const parts = grantToken.split('.');
  if (parts.length !== 5) return { ok: false, reason: 'malformed' };
  const [caseId, customerId, iatStr, expStr, sig] = parts;
  const iat = Number(iatStr);
  const exp = Number(expStr);
  if (!caseId || !customerId || !Number.isFinite(iat) || !Number.isFinite(exp))
    return { ok: false, reason: 'malformed' };
  if (caseId !== expectedCaseId) return { ok: false, reason: 'case_mismatch' };
  const nowSecs = Math.floor(now / 1000);
  if (nowSecs > exp) return { ok: false, reason: 'expired' };
  if (nowSecs < iat) return { ok: false, reason: 'future_iat' };
  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(buildMessage(caseId, customerId, iat, exp))
    .digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return { ok: false, reason: 'invalid_signature' };
  }
  return { ok: true, caseId, customerId, iat, exp };
}

export const caseAccessCookieName = (token: string) => `case_access_${token}`;
