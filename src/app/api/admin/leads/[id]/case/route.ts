import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/rbac';
import { getNextCaseNumber } from '@/features/case-number/server/get-next-case-number';
import { createCaseWithUniqueToken } from '@/features/case-token/server/case-token';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
        },
        { status: guard.status }
      );
    }

    const { id: leadId } = await params;
    if (!leadId) {
      return NextResponse.json(
        { ok: false, error: 'lead id missing' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        case: {
          select: {
            id: true,
            token: true,
            caseNumber: true,
            createdAt: true
          }
        }
      }
    });

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: 'lead not found' },
        { status: 404 }
      );
    }

    if (lead.case) {
      return NextResponse.json({
        ok: true,
        case: lead.case,
        alreadyExisted: true
      });
    }

    const created = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const caseNumber = await getNextCaseNumber(tx);

        const caseRecord = await createCaseWithUniqueToken((token) =>
          tx.case.create({
            data: {
              token,
              caseNumber,
              leadId,
              events: {
                create: [
                  {
                    lane: 'GUTACHTER',
                    status: 'EINGEGANGEN',
                    note: 'Case erstellt aus Lead',
                    occurredAt: new Date()
                  },
                  {
                    lane: 'ANWALT',
                    status: 'FALL_EINGEGANGEN',
                    note: 'Case erstellt aus Lead',
                    occurredAt: new Date()
                  }
                ]
              }
            },
            include: { events: { orderBy: { occurredAt: 'asc' } } }
          })
        );

        await tx.lead.update({
          where: { id: leadId },
          data: { status: 'IN_PROGRESS' }
        });

        return caseRecord;
      }
    );

    return NextResponse.json({ ok: true, case: created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
