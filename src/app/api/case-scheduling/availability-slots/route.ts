import { NextResponse } from 'next/server';
import { requireRole, isPartner } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getPartnerSchedulingContext } from '@/features/case-scheduling/lib/get-partner-scheduling-context';
import {
  parseNullableBoolean,
  parseSlotBufferMinutes,
  parseSlotDuration,
  parseSlotRole,
  parseSlotTime,
  parseSlotType,
  parseSlotWeekday,
  isValidSlotRange
} from '@/features/case-scheduling/lib/availability-slot-input';
import type { PartnerAvailabilitySlotRow } from '@/features/case-scheduling/types';
import { SCHEDULING_DEFAULT_BUFFER_MINUTES } from '@/features/case-scheduling/lib/scheduling-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toRow(slot: any): PartnerAvailabilitySlotRow {
  return {
    id: slot.id,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
    partnerId: slot.partnerId,
    role: slot.role,
    appointmentType: slot.appointmentType,
    duration: slot.duration,
    weekday: slot.weekday,
    startTime: slot.startTime,
    endTime: slot.endTime,
    bufferMinutes: slot.bufferMinutes,
    isActive: slot.isActive,
    specificDate:
      slot.specificDate instanceof Date
        ? slot.specificDate.toISOString()
        : (slot.specificDate ?? null)
  };
}

async function resolvePartner() {
  const guard = await requireRole();

  if (!guard.ok) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: guard.status === 401 ? 'Unauthorized' : 'Forbidden'
        },
        { status: guard.status }
      )
    } as const;
  }

  if (!isPartner(guard.role)) {
    return {
      error: NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 }
      )
    } as const;
  }

  const context = await getPartnerSchedulingContext({
    clerkUserId: guard.userId!,
    role: guard.role as 'GUTACHTER' | 'ANWALT'
  });

  if (!context) {
    return {
      error: NextResponse.json(
        { ok: false, error: 'partner profile missing' },
        { status: 400 }
      )
    } as const;
  }

  return { context };
}

export async function GET() {
  try {
    const resolved = await resolvePartner();
    if ('error' in resolved) return resolved.error;

    const slots = await prisma.partnerAvailabilitySlot.findMany({
      where: { partnerId: resolved.context.partnerId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }]
    });

    return NextResponse.json({
      ok: true,
      slots: slots.map(toRow),
      count: slots.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const resolved = await resolvePartner();
    if ('error' in resolved) return resolved.error;

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const role = parseSlotRole(body.role);
    const appointmentType = parseSlotType(body.appointmentType);
    const duration = parseSlotDuration(body.duration);
    const weekday = parseSlotWeekday(body.weekday);
    const startTime = parseSlotTime(body.startTime);
    const endTime = parseSlotTime(body.endTime);
    const hasBufferMinutes = Object.prototype.hasOwnProperty.call(
      body,
      'bufferMinutes'
    );
    const parsedBufferMinutes = hasBufferMinutes
      ? parseSlotBufferMinutes(body.bufferMinutes)
      : SCHEDULING_DEFAULT_BUFFER_MINUTES;
    const isActive =
      body.isActive === undefined ? true : parseNullableBoolean(body.isActive);

    // specificDate is optional — null/absent = recurring, ISO string = one-time
    let specificDate: Date | null = null;
    if (body.specificDate != null && body.specificDate !== '') {
      const parsed = new Date(String(body.specificDate));
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { ok: false, error: 'specificDate invalid' },
          { status: 400 }
        );
      }
      specificDate = parsed;
    }

    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'role missing or invalid' },
        { status: 400 }
      );
    }

    if (!appointmentType) {
      return NextResponse.json(
        { ok: false, error: 'appointmentType missing or invalid' },
        { status: 400 }
      );
    }

    if (!duration) {
      return NextResponse.json(
        { ok: false, error: 'duration missing or invalid' },
        { status: 400 }
      );
    }

    if (weekday === null) {
      return NextResponse.json(
        { ok: false, error: 'weekday missing or invalid' },
        { status: 400 }
      );
    }

    if (!startTime) {
      return NextResponse.json(
        { ok: false, error: 'startTime missing or invalid' },
        { status: 400 }
      );
    }

    if (!endTime) {
      return NextResponse.json(
        { ok: false, error: 'endTime missing or invalid' },
        { status: 400 }
      );
    }

    if (!isValidSlotRange(startTime, endTime)) {
      return NextResponse.json(
        { ok: false, error: 'endTime must be after startTime' },
        { status: 400 }
      );
    }

    if (hasBufferMinutes && parsedBufferMinutes === null) {
      return NextResponse.json(
        { ok: false, error: 'bufferMinutes invalid' },
        { status: 400 }
      );
    }

    if (isActive !== true && isActive !== false) {
      return NextResponse.json(
        { ok: false, error: 'isActive invalid' },
        { status: 400 }
      );
    }

    const slot = await prisma.partnerAvailabilitySlot.create({
      data: {
        partnerId: resolved.context.partnerId,
        role,
        appointmentType,
        duration,
        weekday,
        startTime,
        endTime,
        bufferMinutes: parsedBufferMinutes ?? undefined,
        isActive,
        specificDate
      }
    });

    return NextResponse.json({
      ok: true,
      slot: toRow(slot)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
