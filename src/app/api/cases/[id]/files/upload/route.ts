import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCaseWrite } from '@/lib/policy';
import { putStoredFile } from '@/lib/storage';
import { logOperationalEvent } from '@/lib/ops-log';
import type { ProcessCaseFileResult } from '@/features/gutachten-insights/lib/process-case-file';
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
    const { id: caseId } = await params;
    if (!caseId) {
      return NextResponse.json(
        { ok: false, error: 'Missing case id' },
        { status: 400 }
      );
    }

    // ── Step 1: Authorization — DB-backed, no Clerk metadata fallback ─────────
    //
    // Try INTERNAL admin path first (FILES_ADMIN: INTERNAL org + ADMIN/OWNER +
    // OWNER CaseOrg). If that fails for any reason other than 401 (unauthenticated),
    // try the partner path (FILES_PARTNER: ASSIGNED CaseOrg + ACCEPTED active
    // assignment with activeKey='ACTIVE').

    const adminGuard = await requireCaseWrite(caseId, 'FILES_ADMIN');

    let isAdminCaller: boolean;
    let clerkUserId: string;
    let derivedLane: CaseLane | null;

    if (adminGuard.ok) {
      isAdminCaller = true;
      clerkUserId = adminGuard.clerkUserId;
      derivedLane = null; // admin uploads go to the admin folder
    } else if (adminGuard.status === 401) {
      await logOperationalEvent({
        caseId,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: 'SYSTEM',
        actorId: null,
        message: 'Upload denied: unauthorized',
        metadata: { status: 401 }
      });
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    } else {
      // Not an INTERNAL admin (403 or 404) — try partner path
      const partnerGuard = await requireCaseWrite(caseId, 'FILES_PARTNER');

      if (!partnerGuard.ok) {
        const status = partnerGuard.status === 401 ? 401 : 403;
        await logOperationalEvent({
          caseId,
          domain: 'FILE',
          action: 'UPLOAD',
          result: 'DENIED',
          actorType: 'SYSTEM',
          actorId: null,
          message:
            status === 401
              ? 'Upload denied: unauthorized'
              : 'Upload denied: forbidden (no write capability)',
          metadata: {
            adminStatus: adminGuard.status,
            partnerStatus: partnerGuard.status
          }
        });
        return NextResponse.json(
          { ok: false, error: status === 401 ? 'Unauthorized' : 'Forbidden' },
          { status }
        );
      }

      // ── Step 2: Derive lane from DB org type — never trust client input ─────
      //
      // The CaseLane is determined exclusively from the caller's DB organization
      // type. GUTACHTER org → GUTACHTER lane; LEGAL org → ANWALT lane.

      const assignedCaseOrg = partnerGuard.caseOrgs.find(
        (co) => co.role === 'ASSIGNED'
      );
      if (!assignedCaseOrg) {
        // Invariant violation: FILES_PARTNER succeeded but no ASSIGNED CaseOrg
        await logOperationalEvent({
          caseId,
          domain: 'FILE',
          action: 'UPLOAD',
          result: 'DENIED',
          actorType: 'PARTNER',
          actorId: partnerGuard.clerkUserId,
          message:
            'Upload denied: no ASSIGNED CaseOrg despite FILES_PARTNER grant',
          metadata: {}
        });
        return NextResponse.json(
          { ok: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const orgType = assignedCaseOrg.organization.type;
      if (orgType === 'GUTACHTER') {
        derivedLane = CaseLane.GUTACHTER;
      } else if (orgType === 'LEGAL') {
        derivedLane = CaseLane.ANWALT;
      } else {
        await logOperationalEvent({
          caseId,
          domain: 'FILE',
          action: 'UPLOAD',
          result: 'DENIED',
          actorType: 'PARTNER',
          actorId: partnerGuard.clerkUserId,
          message: `Upload denied: unexpected partner org type ${orgType}`,
          metadata: { orgType }
        });
        return NextResponse.json(
          { ok: false, error: `Unsupported partner org type: ${orgType}` },
          { status: 422 }
        );
      }

      isAdminCaller = false;
      clerkUserId = partnerGuard.clerkUserId;
    }

    // ── Step 3: Parse and validate file + metadata ────────────────────────────
    //
    // Authorization is complete before any form data is read. Storage is never
    // touched for unauthorized requests.

    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      await logOperationalEvent({
        caseId,
        domain: 'FILE',
        action: 'UPLOAD',
        result: 'DENIED',
        actorType: isAdminCaller ? 'ADMIN' : 'PARTNER',
        actorId: clerkUserId,
        message: 'Upload denied: file missing',
        metadata: { isAdminCaller, derivedLane }
      });
      return NextResponse.json(
        { ok: false, error: 'file required' },
        { status: 400 }
      );
    }

    const title = clean(form.get('title')) || clean(form.get('label')) || null;
    const visibility = asVisibility(form.get('visibility'));
    const category = asCategory(clean(form.get('category')));

    // ── Step 4: Write to storage ──────────────────────────────────────────────
    //
    // Only reached after full authorization. caseId is always from the route
    // param — no client-supplied override is accepted.

    const folder = derivedLane
      ? `cases/${caseId}/partners/${String(derivedLane).toLowerCase()}`
      : `cases/${caseId}/partners/admin`;

    const saved = await putStoredFile({ file, folder });

    // ── Step 5: Create CaseFile record ────────────────────────────────────────
    //
    // storageKey stored in DB but excluded from the select — never returned
    // to the client response.

    const createdFile = await prisma.caseFile.create({
      data: {
        caseId,
        uploaderType: isAdminCaller
          ? CaseFileUploaderType.ADMIN
          : CaseFileUploaderType.PARTNER,
        uploaderId: clerkUserId,
        role: derivedLane,
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
        // storageKey intentionally omitted — never expose to clients
        createdAt: true
      } as any
    });

    const createdFileId = String(createdFile.id);

    await logOperationalEvent({
      caseId,
      domain: 'FILE',
      action: 'UPLOAD',
      result: 'SUCCESS',
      actorType: isAdminCaller ? 'ADMIN' : 'PARTNER',
      actorId: clerkUserId,
      message: 'File upload successful',
      metadata: {
        lane: derivedLane,
        fileId: createdFileId,
        filename: createdFile.filename,
        title: createdFile.title,
        mimeType: createdFile.mimeType,
        size: createdFile.size,
        visibility: createdFile.visibility,
        category: createdFile.category,
        storageKey: saved.storageKey // internal log only
      }
    });

    let processingResult: ProcessCaseFileResult | null = null;

    if (
      String(createdFile.mimeType ?? '')
        .toLowerCase()
        .includes('pdf')
    ) {
      try {
        const { processCaseFile } = await import(
          '@/features/gutachten-insights/lib/process-case-file'
        );
        processingResult = await processCaseFile({
          caseId,
          fileId: createdFileId
        });
      } catch (error) {
        console.warn('[file-upload] post-process degraded', {
          caseId,
          fileId: createdFileId,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    try {
      const visibilityValue = String(createdFile.visibility ?? '');
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
          visibility: createdFile.visibility,
          title: createdFile.title ?? createdFile.filename
        });

        if (toEmail && token) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const docsUrl = `${appUrl}/case/${token}/documents`;
          const label = caseWithCustomer.caseNumber ?? 'Fall ohne Nummer';

          const { sendMail } = await import('@/lib/mailer');

          await sendMail({
            to: toEmail,
            subject: `Gutachtery24 – Neue Dokumente zu Fall ${label}`,
            text:
              `Es wurden neue Dokumente zu deinem Fall ${label} hochgeladen.\n\n` +
              `Dokument: ${createdFile.title ?? createdFile.filename}\n` +
              `Link: ${docsUrl}\n`,
            html: `
              <p>Es wurden neue Dokumente zu deinem Fall <b>${label}</b> hochgeladen.</p>
              <p><b>Dokument:</b> ${createdFile.title ?? createdFile.filename}</p>
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

    return NextResponse.json({
      ok: true,
      file: createdFile,
      processing: processingResult
    });
  } catch (e: any) {
    await logOperationalEvent({
      caseId: null,
      domain: 'FILE',
      action: 'UPLOAD',
      result: 'FAILED',
      actorType: 'SYSTEM',
      actorId: null,
      message: 'File upload failed',
      metadata: { error: String(e?.message ?? e) }
    });

    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
