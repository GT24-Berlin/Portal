import crypto from 'node:crypto';

import { prisma } from '@/lib/prisma';

const OTP_SECRET = process.env.OTP_SECRET || 'dev-secret-change-me';
const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

export function normalizeOtpEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateOtpCode(length = OTP_LENGTH) {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

export function hashOtpCode(code: string) {
  return crypto.createHmac('sha256', OTP_SECRET).update(code).digest('hex');
}

export function getOtpExpiryDate(now = new Date()) {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

export function getOtpCooldownDate(now = new Date()) {
  return new Date(now.getTime() - OTP_RESEND_COOLDOWN_SECONDS * 1000);
}

export type CaseOtpChallengeState = {
  caseId: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date | null;
  verifiedAt: Date | null;
};

export async function getCaseOtpByCaseIdAndEmail(input: {
  caseId: string;
  email: string;
}) {
  return prisma.caseCustomerOtp.findUnique({
    where: {
      caseId_email: {
        caseId: input.caseId,
        email: normalizeOtpEmail(input.email)
      }
    }
  });
}

export async function createOrReplaceCaseOtpChallenge(input: {
  caseId: string;
  email: string;
  code: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const normalizedEmail = normalizeOtpEmail(input.email);
  const codeHash = hashOtpCode(input.code);
  const expiresAt = getOtpExpiryDate(now);

  return prisma.caseCustomerOtp.upsert({
    where: {
      caseId_email: {
        caseId: input.caseId,
        email: normalizedEmail
      }
    },
    create: {
      caseId: input.caseId,
      email: normalizedEmail,
      codeHash,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      verifiedAt: null
    },
    update: {
      codeHash,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      verifiedAt: null
    }
  });
}

export function isOtpExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export function isOtpResendAllowed(lastSentAt: Date | null, now = new Date()) {
  if (!lastSentAt) return true;
  return lastSentAt.getTime() <= getOtpCooldownDate(now).getTime();
}

export function hasOtpAttemptsRemaining(attempts: number) {
  return attempts < OTP_MAX_ATTEMPTS;
}

export async function incrementCaseOtpAttempts(input: {
  caseId: string;
  email: string;
}) {
  return prisma.caseCustomerOtp.update({
    where: {
      caseId_email: {
        caseId: input.caseId,
        email: normalizeOtpEmail(input.email)
      }
    },
    data: {
      attempts: {
        increment: 1
      }
    }
  });
}

export async function markCaseOtpVerified(input: {
  caseId: string;
  email: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return prisma.caseCustomerOtp.update({
    where: {
      caseId_email: {
        caseId: input.caseId,
        email: normalizeOtpEmail(input.email)
      }
    },
    data: {
      verifiedAt: now
    }
  });
}

export async function clearCaseOtpChallenge(input: {
  caseId: string;
  email: string;
}) {
  return prisma.caseCustomerOtp.update({
    where: {
      caseId_email: {
        caseId: input.caseId,
        email: normalizeOtpEmail(input.email)
      }
    },
    data: {
      codeHash: '',
      expiresAt: new Date(0),
      attempts: 0
    }
  });
}

export function isOtpCodeMatching(input: {
  incomingCode: string;
  expectedCodeHash: string;
}) {
  const incomingHash = hashOtpCode(input.incomingCode);
  return incomingHash === input.expectedCodeHash;
}

export const caseOtpConfig = {
  otpLength: OTP_LENGTH,
  otpTtlMinutes: OTP_TTL_MINUTES,
  otpResendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  otpMaxAttempts: OTP_MAX_ATTEMPTS
};
