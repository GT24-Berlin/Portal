import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CaseFileVisibility } from '@prisma/client';
import { putStoredFile } from '@/lib/storage';
import { logOperationalEvent } from '@/lib/ops-log';

export const runtime = 'nodejs';

function clean(s: any) {
  return String(s ?? '').trim();
}

function asVisibility(v: FormDataEntryValue | null): CaseFileVisibility {
  const s = String(v ?? '')
    .trim()
    .toUpperCase();

  if (s === 'CUSTOMER') return CaseFileVisibility.CUSTOMER;
  if (s === 'PARTNERS') return CaseFileVisibility.PARTNERS;
  if (s === 'CUSTOMER_AND_PARTNERS') {
    return CaseFileVisibility.CUSTOMER_AND_PARTNERS;
  }

  if (
    s === 'PARTNER' ||
    s === 'ONLY_PARTNERS' ||
    s === 'NUR_PARTNER' ||
    s === 'NUR PARTNER'
  ) {
    return CaseFileVisibility.PARTNERS;
  }

  return CaseFileVisibility.CUSTOMER_AND_PARTNERS;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      await logOperationalEvent({
        caseId: null,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'Customer upload denied: token missing',
        metadata: {}
      });

      return NextResponse.json(
        { ok: false, error: 'token_missing' },
        { status: 400 }
      );
    }

    const c = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        customer: {
          select: {
            id: true,
            otpVerifiedAt: true
          }
        }
      }
    });

    if (!c) {
      await logOperationalEvent({
        caseId: null,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'Customer upload denied: case not found',
        metadata: {
          token
        }
      });

      return NextResponse.json(
        { ok: false, error: 'case_not_found' },
        { status: 404 }
      );
    }

    if (!c.customer?.id) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: null,
        message: 'Customer upload denied: customer not registered',
        metadata: {
          token
        }
      });

      return NextResponse.json(
        { ok: false, error: 'customer_not_registered' },
        { status: 409 }
      );
    }

    if (!c.customer.otpVerifiedAt) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'Customer upload denied: otp not verified',
        metadata: {
          token
        }
      });

      return NextResponse.json(
        { ok: false, error: 'otp_not_verified' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    const label = clean(formData.get('label'));
    const category = clean(formData.get('category'));
    const visibility = asVisibility(formData.get('visibility'));

    if (!(file instanceof File)) {
      await logOperationalEvent({
        caseId: c.id,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: 'CUSTOMER',
        actorId: c.customer.id,
        message: 'Customer upload denied: file missing',
        metadata: {
          token,
          label,
          category,
          visibility
        }
      });

      return NextResponse.json(
        { ok: false, error: 'file_required' },
        { status: 400 }
      );
    }

    const stored = await putStoredFile({
      file,
      folder: `cases/${c.id}/customer`
    });

    const row = await prisma.caseFile.create({
      data: {
        caseId: c.id,
        uploaderType: 'CUSTOMER' as any,
        uploaderId: null,
        role: null,
        visibility,
        category: (category && category.length ? category : 'OTHER') as any,
        title: label ? String(label) : file.name,
        filename: file.name,
        mimeType: stored.mimeType ?? null,
        size: stored.size ?? null,
        storageKey: stored.storageKey
      } as any,
      select: {
        id: true,
        caseId: true,
        uploaderType: true,
        uploaderId: true,
        role: true,
        visibility: true,
        category: true,
        title: true,
        filename: true,
        mimeType: true,
        size: true,
        storageKey: true,
        createdAt: true
      } as any
    });

    await logOperationalEvent({
      caseId: c.id,
      domain: 'FILE',
      action: 'UPLOAD',
      result: 'SUCCESS',
      actorType: 'CUSTOMER',
      actorId: c.customer.id,
      message: 'Customer file upload successful',
      metadata: {
        token,
        fileId: row.id,
        filename: row.filename,
        title: row.title,
        mimeType: row.mimeType,
        size: row.size,
        visibility: row.visibility,
        category: row.category,
        storageKey: row.storageKey
      }
    });

    try {
      const visibilityValue = String(row.visibility ?? '');
      const isVisibleToCustomer =
        visibilityValue === CaseFileVisibility.CUSTOMER ||
        visibilityValue === CaseFileVisibility.CUSTOMER_AND_PARTNERS;

      if (isVisibleToCustomer) {
        const caseWithCustomer = await prisma.case.findUnique({
          where: { id: c.id },
          select: {
            token: true,
            caseNumber: true,
            customer: { select: { email: true, firstName: true } }
          }
        });

        const toEmail = caseWithCustomer?.customer?.email;
        const caseToken = caseWithCustomer?.token;

        console.log('[MAIL][to-customer] file uploaded:', {
          caseId: c.id,
          token: caseToken,
          toEmail,
          visibility: row.visibility,
          title: row.title ?? row.filename
        });

        if (toEmail && caseToken) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const docsUrl = `${appUrl}/case/${caseToken}/documents`;
          const labelCase = caseWithCustomer?.caseNumber ?? c.id.slice(0, 8);

          const { sendMail } = await import('@/lib/mailer');

          await sendMail({
            to: toEmail,
            subject: `Gutachtery24 – Neues Dokument zu Fall ${labelCase}`,
            text:
              `Es wurde ein neues Dokument zu deinem Fall ${labelCase} hochgeladen.\n\n` +
              `Dokument: ${row.title ?? row.filename}\n` +
              `Link: ${docsUrl}\n`,
            html: `
          <p>Es wurde ein neues Dokument zu deinem Fall <b>${labelCase}</b> hochgeladen.</p>
          <p><b>Dokument:</b> ${row.title ?? row.filename}</p>
          <p><a href="${docsUrl}">Meine Dokumente öffnen</a></p>
        `
          });

          console.log('[MAIL][to-customer] sent OK:', {
            toEmail,
            caseId: c.id
          });
        }
      }
    } catch (e) {
      console.warn(
        'Customer document notification email failed: SMTP unavailable'
      );
    }

    return NextResponse.json({ ok: true, file: row });
  } catch (e: any) {
    await logOperationalEvent({
      caseId: null,
      domain: 'FILE',
      action: 'UPLOAD',
      result: 'FAILED',
      actorType: 'CUSTOMER',
      actorId: null,
      message: 'Customer file upload failed',
      metadata: {
        error: String(e?.message ?? e)
      }
    });

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
