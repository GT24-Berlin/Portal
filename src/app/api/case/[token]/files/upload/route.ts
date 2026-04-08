import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeUploadFile } from '@/lib/uploads';
import { CaseFileVisibility } from '@prisma/client';

export const runtime = 'nodejs';

function clean(s: any) {
  return String(s ?? '').trim();
}

function asVisibility(v: FormDataEntryValue | null): CaseFileVisibility {
  const s = String(v ?? '')
    .trim()
    .toUpperCase();

  // exakte Enum-Werte (aus dem UI / FormData)
  if (s === 'CUSTOMER') return CaseFileVisibility.CUSTOMER;
  if (s === 'PARTNERS') return CaseFileVisibility.PARTNERS;
  if (s === 'CUSTOMER_AND_PARTNERS')
    return CaseFileVisibility.CUSTOMER_AND_PARTNERS;

  // tolerant: alte/umgangssprachliche Werte weiterhin akzeptieren
  if (
    s === 'PARTNER' ||
    s === 'ONLY_PARTNERS' ||
    s === 'NUR_PARTNER' ||
    s === 'NUR PARTNER'
  ) {
    return CaseFileVisibility.PARTNERS;
  }

  // Default (MVP): Kunde + Partner
  return CaseFileVisibility.CUSTOMER_AND_PARTNERS;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'token_missing' },
        { status: 400 }
      );
    }

    // 1) Case + Customer Gate (OTP verified)
    const c = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        customer: { select: { id: true, otpVerifiedAt: true } }
      }
    });

    if (!c) {
      return NextResponse.json(
        { ok: false, error: 'case_not_found' },
        { status: 404 }
      );
    }
    if (!c.customer?.id) {
      return NextResponse.json(
        { ok: false, error: 'customer_not_registered' },
        { status: 409 }
      );
    }
    if (!c.customer.otpVerifiedAt) {
      return NextResponse.json(
        { ok: false, error: 'otp_not_verified' },
        { status: 403 }
      );
    }

    // 2) Parse multipart/form-data
    const form = await req.formData();
    const file = form.get('file') as File | null;

    // optional meta
    const label = clean(form.get('label')); // z.B. "Fahrzeugschein", "Schadenfoto"
    const category = clean(form.get('category')); // optional, frei
    const visibility = CaseFileVisibility.CUSTOMER_AND_PARTNERS;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'file_required' },
        { status: 400 }
      );
    }

    const originalName = file.name || 'upload';
    const bytes = Buffer.from(await file.arrayBuffer());

    // 3) Save file to disk
    const saved = await writeUploadFile(bytes, originalName);

    // 4) DB record
    // Hinweis: wir nehmen hier simple Strings für "kind/uploadedByRole/visibility",
    // damit es NICHT crasht falls du noch keine Enums dafür hast.
    // 4) DB record (Customer Upload)
    const row = await prisma.caseFile.create({
      data: {
        caseId: c.id,

        uploaderType: 'CUSTOMER' as any, // CaseFileUploaderType
        uploaderId: null, // Customer hat keine Clerk userId
        role: null, // null bei Customer Upload

        visibility,
        category: (category && category.length ? category : 'OTHER') as any,

        title: label ? String(label) : null,

        filename: saved.filename,
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

    // ✅ Customer Email Notification (nur wenn Datei für Kunde sichtbar ist)
    try {
      const isVisibleToCustomer =
        row.visibility === CaseFileVisibility.CUSTOMER ||
        row.visibility === CaseFileVisibility.CUSTOMER_AND_PARTNERS;

      if (isVisibleToCustomer) {
        const caseWithCustomer = await prisma.case.findUnique({
          where: { id: c.id }, // wichtig: hier DB-caseId verwenden
          select: {
            token: true,
            caseNumber: true,
            customer: { select: { email: true, firstName: true } }
          }
        });

        const toEmail = caseWithCustomer?.customer?.email;
        const token = caseWithCustomer?.token;

        console.log('[MAIL][to-customer] file uploaded:', {
          caseId: c.id,
          token,
          toEmail,
          visibility: row.visibility,
          title: row.title ?? row.filename
        });

        if (toEmail && token) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const docsUrl = `${appUrl}/case/${token}/documents`;
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
        }
      }
    } catch (e) {
      console.error('Customer document notification email failed:', e);
    }

    return NextResponse.json({ ok: true, file: row });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
