/**
 * GT24 NEXT Bootstrap Safety Harness — mailer tests
 *
 * Tests verify:
 * 1. Null transport used when SMTP_HOST is unset
 * 2. SC-10: @gutachtery24.de recipients rejected in NEXT environment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('nodemailer', () => {
  const mockTransport = {
    sendMail: vi.fn().mockResolvedValue({ message: '{"messageId":"test"}' })
  };
  return {
    default: {
      createTransport: vi.fn().mockReturnValue(mockTransport)
    }
  };
});

describe('mailer: null transport', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses jsonTransport when SMTP_HOST is unset', async () => {
    delete process.env.SMTP_HOST;
    const nodemailer = await import('nodemailer');
    await import('@/lib/mailer');
    expect(nodemailer.default.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ jsonTransport: true })
    );
  });

  it('SC-10: rejects @gutachtery24.de recipient in NEXT environment', async () => {
    process.env.GT24_ENVIRONMENT = 'next';
    const { sendMail } = await import('@/lib/mailer');
    await expect(
      sendMail({ to: 'customer@gutachtery24.de', subject: 'Test' })
    ).rejects.toThrow(/SC-10/);
    delete process.env.GT24_ENVIRONMENT;
  });

  it('allows @gt24-test.internal recipients', async () => {
    process.env.GT24_ENVIRONMENT = 'next';
    const { sendMail } = await import('@/lib/mailer');
    await expect(
      sendMail({ to: 'test@gt24-test.internal', subject: 'Test' })
    ).resolves.toBeDefined();
    delete process.env.GT24_ENVIRONMENT;
  });
});
