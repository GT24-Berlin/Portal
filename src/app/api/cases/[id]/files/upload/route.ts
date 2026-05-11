import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isAdmin, isPartner } from '@/lib/rbac';
import { putStoredFile } from '@/lib/storage';
import { logOperationalEvent } from '@/lib/ops-log';
import {
  CaseFileUploaderType,
  CaseFileVisibility,
  CaseFileCategory,
  CaseLane
} from '@prisma/client';

export const runtime = 'nodejs';

function clean(v: FormDataEntryValue | null) {
  return String(v ?? '').trim();
}

function asVisibility(v: FormDataEntryValue | null): CaseFileVisibility {
  const s = String(v ?? '')
    .trim()
    .toUpperCase();

  if (['CUSTOMER', 'NUR_KUNDE', 'NUR KUNDE'].includes(s)) {
    return CaseFileVisibility.CUSTOMER;
  }

  if (
    [
      'PARTNERS',
      'PARTNER',
      'ONLY_PARTNERS',
      'NUR_PARTNER',
      'NUR PARTNER'
    ].includes(s)
  ) {
    return CaseFileVisibility.PARTNERS;
  }

  return CaseFileVisibility.CUSTOMER_AND_PARTNERS;
}

function asCategory(v: string): CaseFileCategory {
  const s = (v || '').toUpperCase().trim();

  const map: Record<string, CaseFileCategory> = {
    REPORT: CaseFileCategory.LAW_DOCS,
    PHOTO: CaseFileCategory.CUSTOMER_PHOTOS,
    REGISTRATION_DOC: CaseFileCategory.REGISTRATION_DOCS,
    INSURANCE_DOC: CaseFileCategory.INSURANCE_DOCS
  };

  if (map[s]) return map[s];

  return (Object.values(CaseFileCategory) as string[]).includes(s)
    ? (s as any)
    : CaseFileCategory.OTHER;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole();

    if (!guard.ok) {
      await logOperationalEvent({
        caseId: null,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: 'SYSTEM',
        actorId: null,
        message:
          guard.status === 401
            ? 'Partner/Admin upload denied: unauthorized'
            : 'Partner/Admin upload denied: forbidden',
        metadata: {
          status: guard.status
        }
      });

      return NextResponse.json(
        {
          ok: false,
          error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
        },
        { status: guard.status }
      );
    }

    const { id: caseId } = await params;
    if (!caseId) {
      await logOperationalEvent({
        caseId: null,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: isAdmin(guard.role) ? 'ADMIN' : 'PARTNER',
        actorId: guard.userId ?? null,
        message: 'Partner/Admin upload denied: missing case id',
        metadata: {}
      });

      return NextResponse.json(
        { ok: false, error: 'Missing case id' },
        { status: 400 }
      );
    }

    const role = guard.role;
    const userId = guard.userId!;

    if (isPartner(role) && !isAdmin(role)) {
      const a = await prisma.caseAssignment.findFirst({
        where: {
          caseId,
          assigneeClerkUserId: userId,
          role: role as any,
          activeKey: 'ACTIVE',
          status: 'ACCEPTED' as any
        },
        select: { id: true }
      });

      if (!a) {
        await logOperationalEvent({
          caseId,
          domain: 'FILE',
          action: 'UPLOAD',
          result: 'DENIED',
          actorType: 'PARTNER',
          actorId: userId,
          message: 'Partner upload denied: no accepted active assignment',
          metadata: {
            role
          }
        });

        return NextResponse.json(
          { ok: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      await logOperationalEvent({
        caseId,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: isAdmin(role) ? 'ADMIN' : 'PARTNER',
        actorId: userId,
        message: 'Partner/Admin upload denied: file missing',
        metadata: {
          role
        }
      });

      return NextResponse.json(
        { ok: false, error: 'file required' },
        { status: 400 }
      );
    }

    const title = clean(form.get('title')) || clean(form.get('label')) || null;
    const visibility = asVisibility(form.get('visibility'));
    const category = asCategory(clean(form.get('category')));

    const c = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true }
    });

    if (!c) {
      await logOperationalEvent({
        caseId,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: isAdmin(role) ? 'ADMIN' : 'PARTNER',
        actorId: userId,
        message: 'Partner/Admin upload denied: case not found',
        metadata: {
          role
        }
      });

      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    }

    const lane: CaseLane | null =
      role === 'GUTACHTER'
        ? CaseLane.GUTACHTER
        : role === 'ANWALT'
          ? CaseLane.ANWALT
          : null;

    const folder = lane
      ? `cases/${c.id}/partners/${String(lane).toLowerCase()}`
      : `cases/${c.id}/partners/admin`;

    const saved = await putStoredFile({
      file,
      folder
    });

    const row = await prisma.caseFile.create({
      data: {
        caseId: c.id,
        uploaderType: isAdmin(role)
          ? CaseFileUploaderType.ADMIN
          : CaseFileUploaderType.PARTNER,
        uploaderId: userId,
        role: lane,
        visibility,
        category,
        title,
        filename: file.name || saved.originalFilename,
        mimeType: saved.mimeType ?? null,
        size: saved.size ?? null,
        storageKey: saved.storageKey
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
      actorType: isAdmin(role) ? 'ADMIN' : 'PARTNER',
      actorId: userId,
      message: 'Partner/Admin file upload successful',
      metadata: {
        role,
        lane,
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
          where: { id: caseId },
          select: {
            token: true,
            caseNumber: true,
            customer: { select: { email: true, firstName: true } }
          }
        });

        const toEmail = caseWithCustomer?.customer?.email;
        const token = caseWithCustomer?.token;

        console.log('[MAIL][to-customer] file uploaded:', {
          caseId,
          token,
          toEmail,
          visibility: row.visibility,
          title: row.title ?? row.filename
        });

        if (toEmail && token) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const docsUrl = `${appUrl}/case/${token}/documents`;
          const label = caseWithCustomer.caseNumber ?? caseId.slice(0, 8);

          const { sendMail } = await import('@/lib/mailer');

          await sendMail({
            to: toEmail,
            subject: `Gutachtery24 – Neue Dokumente zu Fall ${label}`,
            text:
              `Es wurden neue Dokumente zu deinem Fall ${label} hochgeladen.\n\n` +
              `Dokument: ${row.title ?? row.filename}\n` +
              `Link: ${docsUrl}\n`,
            html: `
              <p>Es wurden neue Dokumente zu deinem Fall <b>${label}</b> hochgeladen.</p>
              <p><b>Dokument:</b> ${row.title ?? row.filename}</p>
              <p><a href="${docsUrl}">Meine Dokumente öffnen</a></p>
            `
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
      actorType: 'SYSTEM',
      actorId: null,
      message: 'Partner/Admin file upload failed',
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
