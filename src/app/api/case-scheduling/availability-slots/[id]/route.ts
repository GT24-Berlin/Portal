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

function hasOwn(obj: unknown, key: string) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

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
    isActive: slot.isActive
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolvePartner();
    if ('error' in resolved) return resolved.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'id missing' },
        { status: 400 }
      );
    }

    const existing = await prisma.partnerAvailabilitySlot.findFirst({
      where: {
        id,
        partnerId: resolved.context.partnerId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'slot not found' },
        { status: 404 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const data: Record<string, unknown> = {};

    if (hasOwn(body, 'role')) {
      const role = parseSlotRole(body.role);
      if (!role) {
        return NextResponse.json(
          { ok: false, error: 'role invalid' },
          { status: 400 }
        );
      }
      data.role = role;
    }

    if (hasOwn(body, 'appointmentType')) {
      const appointmentType = parseSlotType(body.appointmentType);
      if (!appointmentType) {
        return NextResponse.json(
          { ok: false, error: 'appointmentType invalid' },
          { status: 400 }
        );
      }
      data.appointmentType = appointmentType;
    }

    if (hasOwn(body, 'duration')) {
      const duration = parseSlotDuration(body.duration);
      if (!duration) {
        return NextResponse.json(
          { ok: false, error: 'duration invalid' },
          { status: 400 }
        );
      }
      data.duration = duration;
    }

    if (hasOwn(body, 'weekday')) {
      const weekday = parseSlotWeekday(body.weekday);
      if (weekday === null) {
        return NextResponse.json(
          { ok: false, error: 'weekday invalid' },
          { status: 400 }
        );
      }
      data.weekday = weekday;
    }

    if (hasOwn(body, 'startTime')) {
      const startTime = parseSlotTime(body.startTime);
      if (!startTime) {
        return NextResponse.json(
          { ok: false, error: 'startTime invalid' },
          { status: 400 }
        );
      }
      data.startTime = startTime;
    }

    if (hasOwn(body, 'endTime')) {
      const endTime = parseSlotTime(body.endTime);
      if (!endTime) {
        return NextResponse.json(
          { ok: false, error: 'endTime invalid' },
          { status: 400 }
        );
      }
      data.endTime = endTime;
    }

    const hasBufferMinutes = hasOwn(body, 'bufferMinutes');
    if (hasBufferMinutes) {
      const bufferMinutes = parseSlotBufferMinutes(body.bufferMinutes);
      if (bufferMinutes === null) {
        return NextResponse.json(
          { ok: false, error: 'bufferMinutes invalid' },
          { status: 400 }
        );
      }
      data.bufferMinutes = bufferMinutes;
    }

    if (hasOwn(body, 'isActive')) {
      const isActive = parseNullableBoolean(body.isActive);
      if (isActive === null) {
        return NextResponse.json(
          { ok: false, error: 'isActive invalid' },
          { status: 400 }
        );
      }
      data.isActive = isActive;
    }

    const nextDuration = (data.duration as any) ?? existing.duration;
    const nextStartTime = (data.startTime as any) ?? existing.startTime;
    const nextEndTime = (data.endTime as any) ?? existing.endTime;
    const nextBufferMinutes =
      typeof data.bufferMinutes === 'number'
        ? data.bufferMinutes
        : (existing.bufferMinutes ?? SCHEDULING_DEFAULT_BUFFER_MINUTES);

    if (!isValidSlotRange(nextStartTime, nextEndTime)) {
      return NextResponse.json(
        { ok: false, error: 'endTime must be after startTime' },
        { status: 400 }
      );
    }

    const updated = await prisma.partnerAvailabilitySlot.update({
      where: { id: existing.id },
      data: {
        ...data,
        duration: nextDuration,
        startTime: nextStartTime,
        endTime: nextEndTime,
        bufferMinutes: nextBufferMinutes
      }
    });

    return NextResponse.json({
      ok: true,
      slot: toRow(updated)
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolvePartner();
    if ('error' in resolved) return resolved.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'id missing' },
        { status: 400 }
      );
    }

    const existing = await prisma.partnerAvailabilitySlot.findFirst({
      where: {
        id,
        partnerId: resolved.context.partnerId
      },
      select: { id: true }
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'slot not found' },
        { status: 404 }
      );
    }

    await prisma.partnerAvailabilitySlot.delete({
      where: { id: existing.id }
    });

    return NextResponse.json({ ok: true });
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
