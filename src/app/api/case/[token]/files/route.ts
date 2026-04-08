import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CaseFileVisibility } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'token missing' },
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

    if (!c) {
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    }

    // Gate wie beim Tracker: Kunde muss registriert + OTP verified sein
    if (!c.customer?.id) {
      return NextResponse.json(
        { ok: false, error: 'customer not registered' },
        { status: 409 }
      );
    }
    if (!c.customer.otpVerifiedAt) {
      return NextResponse.json(
        { ok: false, error: 'otp not verified' },
        { status: 403 }
      );
    }

    // Customer-Sicht: CUSTOMER + CUSTOMER_AND_PARTNERS
    const files = await prisma.caseFile.findMany({
      where: {
        caseId: c.id,
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
        createdAt: true,
        uploaderType: true,
        uploaderId: true,
        role: true,
        visibility: true,
        category: true,
        title: true,
        filename: true,
        mimeType: true,
        size: true,
        storageKey: true // fürs Download gleich wichtig
      },
      take: 200
    });

    return NextResponse.json({ ok: true, files });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
