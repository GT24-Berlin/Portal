import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(
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
        customer: { select: { otpVerifiedAt: true } }
      }
    });

    if (!c)
      return NextResponse.json(
        { ok: false, error: 'case not found' },
        { status: 404 }
      );
    if (!c.customer?.otpVerifiedAt) {
      return NextResponse.json(
        { ok: false, error: 'not verified' },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ ok: true });

    // 7 Tage gültig
    res.cookies.set(`case_access_${token}`, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
