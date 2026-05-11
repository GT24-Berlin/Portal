import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createStoredFileDownloadResponse } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; fileId: string }> }
) {
  try {
    const { token, fileId } = await params;
    if (!token || !fileId) {
      return NextResponse.json(
        { ok: false, error: 'missing params' },
        { status: 400 }
      );
    }

    const c = await prisma.case.findUnique({
      where: { token },
      select: {
        id: true,
        customer: { select: { id: true, otpVerifiedAt: true } }
      }
    });

    if (!c)
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    if (!c.customer?.id)
      return NextResponse.json(
        { ok: false, error: 'customer not registered' },
        { status: 409 }
      );
    if (!c.customer.otpVerifiedAt)
      return NextResponse.json(
        { ok: false, error: 'not verified' },
        { status: 403 }
      );

    const file = await prisma.caseFile.findFirst({
      where: {
        id: fileId,
        caseId: c.id,
        visibility: {
          in: ['CUSTOMER', 'CUSTOMER_AND_PARTNERS']
        } as any
      },
      select: {
        filename: true,
        mimeType: true,
        storageKey: true,
        size: true
      }
    });

    if (!file)
      return NextResponse.json(
        { ok: false, error: 'file not found' },
        { status: 404 }
      );

    return createStoredFileDownloadResponse({
      storageKey: file.storageKey,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
