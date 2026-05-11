import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CaseFileVisibility } from '@prisma/client';

export const runtime = 'nodejs';

function clean(v: FormDataEntryValue | null) {
  return String(v ?? '').trim();
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const back = new URL(token ? `/case/${token}/documents` : `/case`, req.url);

  try {
    if (!token) {
      back.searchParams.set('error', 'token_missing');
      return NextResponse.redirect(back, { status: 303 });
    }

    // 1) Case + OTP gate + intake fallback
    const found = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        caseNumber: true,
        token: true,
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            otpVerifiedAt: true
          }
        },
        intake: { select: { id: true, insuranceEmail: true } }
      }
    });

    if (!found) {
      back.searchParams.set('error', 'case_not_found');
      return NextResponse.redirect(back, { status: 303 });
    }

    if (!found.customer) {
      return NextResponse.redirect(
        new URL(`/case/${token}/register`, req.url),
        { status: 303 }
      );
    }

    if (!found.customer.otpVerifiedAt) {
      return NextResponse.redirect(new URL(`/case/${token}/verify`, req.url), {
        status: 303
      });
    }

    // 2) Insurance Email ermitteln: OWN-CaseInsurance > intake.insuranceEmail
    let insuranceEmail: string | null = found.intake?.insuranceEmail ?? null;

    if (found.intake?.id) {
      const own = await prisma.caseInsurance.findFirst({
        where: {
          party: 'OWN' as any,
          ownIntakeId: found.intake.id
        },
        select: { email: true }
      });
      if (own?.email) insuranceEmail = own.email;
    }

    if (!insuranceEmail) {
      back.searchParams.set('error', 'no_insurance_email');
      return NextResponse.redirect(back, { status: 303 });
    }

    // 3) Ausgewählte File IDs aus FormData lesen
    const form = await req.formData();
    const idsRaw = form.getAll('fileId').map((x) => clean(x as any));
    const fileIds = uniq(idsRaw);

    if (fileIds.length === 0) {
      back.searchParams.set('error', 'no_files_selected');
      return NextResponse.redirect(back, { status: 303 });
    }

    // 4) Nur Dateien erlauben, die der Kunde sehen darf (CUSTOMER + CUSTOMER_AND_PARTNERS)
    const files = await prisma.caseFile.findMany({
      where: {
        caseId: found.id,
        id: { in: fileIds },
        visibility: {
          in: [
            CaseFileVisibility.CUSTOMER,
            CaseFileVisibility.CUSTOMER_AND_PARTNERS
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        filename: true,
        visibility: true,
        createdAt: true
      }
    });

    if (files.length === 0) {
      back.searchParams.set('error', 'files_not_allowed');
      return NextResponse.redirect(back, { status: 303 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const labelCase = found.caseNumber ?? found.id.slice(0, 8);

    // Links zeigen auf Customer-Download-Route (token-basiert)
    const linesText = files
      .map((f) => {
        const label = f.title || f.filename;
        const url = `${appUrl}/api/case/${found.token}/files/${f.id}/download`;
        return `- ${label}\n  ${url}`;
      })
      .join('\n\n');

    const htmlList = files
      .map((f) => {
        const label = (f.title || f.filename)
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const url = `${appUrl}/api/case/${found.token}/files/${f.id}/download`;
        return `<li><b>${label}</b><br/><a href="${url}">${url}</a></li>`;
      })
      .join('');

    const subject = `Gutachtery24 – Unterlagen zu Schadenfall ${labelCase}`;
    const text =
      `Guten Tag,\n\n` +
      `anbei erhalten Sie die Unterlagen zum Schadenfall ${labelCase}.\n\n` +
      `${linesText}\n\n` +
      `Mit freundlichen Grüßen\n` +
      `${found.customer.firstName ?? ''}`;

    const html =
      `<p>Guten Tag,</p>` +
      `<p>anbei erhalten Sie die Unterlagen zum Schadenfall <b>${labelCase}</b>.</p>` +
      `<ul>${htmlList}</ul>` +
      `<p>Mit freundlichen Grüßen<br/>${found.customer.firstName ?? ''}</p>`;

    const { sendMail } = await import('@/lib/mailer');

    console.log('[MAIL][to-insurance] sending:', {
      caseId: found.id,
      to: insuranceEmail,
      count: files.length
    });

    await sendMail({
      to: insuranceEmail,
      subject,
      text,
      html
    });

    console.log('[MAIL][to-insurance] sent OK:', {
      caseId: found.id,
      to: insuranceEmail
    });

    back.searchParams.set('sent_insurance', '1');
    return NextResponse.redirect(back, { status: 303 });
  } catch (e: any) {
    console.warn('send-to-insurance failed: mail delivery unavailable');
    back.searchParams.set('error', 'send_failed');
    return NextResponse.redirect(back, { status: 303 });
  }
}
