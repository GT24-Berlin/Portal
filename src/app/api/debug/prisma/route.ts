import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    hasNotification: Boolean((prisma as any).notification),
    keysLikeNoti: Object.keys(prisma as any).filter((k) =>
      k.toLowerCase().includes('noti')
    )
  });
}
