import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextCaseNumber } from '@/features/case-number/server/get-next-case-number';
import { createCaseWithUniqueToken } from '@/features/case-token/server/case-token';

export const runtime = 'nodejs';

type Body = {
  leadId?: string | null;
  caseNumber?: string | null; // optional, z.B. "CS-3004"
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const created = await prisma.$transaction(async (tx) => {
      const caseNumber = await getNextCaseNumber(tx);

      return createCaseWithUniqueToken((token) =>
        tx.case.create({
          data: {
            token,
            caseNumber,
            leadId: body.leadId ?? null,

            // initial status defaults sind im Prisma Schema gesetzt
            events: {
              create: [
                {
                  lane: 'GUTACHTER',
                  status: 'EINGEGANGEN',
                  note: 'Case erstellt',
                  occurredAt: new Date()
                },
                {
                  lane: 'ANWALT',
                  status: 'FALL_EINGEGANGEN',
                  note: 'Case erstellt',
                  occurredAt: new Date()
                }
              ]
            }
          },
          include: { events: { orderBy: { occurredAt: 'asc' } } }
        })
      );
    });

    return NextResponse.json({ ok: true, case: created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
