import 'server-only';
import { prisma } from '@/lib/prisma';
import { getValidAccessToken } from '../lib/token-manager';
import {
  buildGoogleEventPayload,
  buildMicrosoftEventPayload,
  buildAppleIcalString,
  buildCalendarEventInput
} from '../lib/event-builder';
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent
} from '../lib/google-calendar';
import {
  createMicrosoftCalendarEvent,
  deleteMicrosoftCalendarEvent
} from '../lib/microsoft-calendar';
import {
  createAppleCalendarEvent,
  deleteAppleCalendarEvent
} from '../lib/apple-caldav';

export type SyncAppointmentInput =
  | {
      partnerId: string;
      appointmentRequestId: string;
      action: 'create';
      appointmentType: string;
      role: string;
      startAt: Date;
      endAt: Date;
      caseNumber?: string | null;
    }
  | {
      partnerId: string;
      appointmentRequestId: string;
      action: 'delete';
    };

/**
 * Fire-and-forget: syncs a confirmed/declined appointment to all connected
 * external calendars for the given partner.
 *
 * This function NEVER throws — all errors are caught and logged silently
 * so the main API flow is never interrupted.
 */
export async function syncAppointmentToCalendars(
  input: SyncAppointmentInput
): Promise<void> {
  try {
    const connections = await prisma.partnerCalendarConnection.findMany({
      where: { partnerId: input.partnerId, isActive: true }
    });
    if (connections.length === 0) return;

    await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          if (input.action === 'create') {
            const eventInput = buildCalendarEventInput({
              appointmentRequestId: input.appointmentRequestId,
              appointmentType: input.appointmentType,
              role: input.role,
              startAt: input.startAt,
              endAt: input.endAt,
              caseNumber: input.caseNumber
            });

            let externalEventId: string;

            if (conn.provider === 'GOOGLE') {
              const token = await getValidAccessToken(conn);
              externalEventId = await createGoogleCalendarEvent(
                token,
                buildGoogleEventPayload(eventInput)
              );
            } else if (conn.provider === 'MICROSOFT') {
              const token = await getValidAccessToken(conn);
              externalEventId = await createMicrosoftCalendarEvent(
                token,
                buildMicrosoftEventPayload(eventInput)
              );
            } else if (conn.provider === 'APPLE') {
              const encryptedCreds = await getValidAccessToken(conn); // returns raw encrypted string
              const uid = `gt24-${input.appointmentRequestId}@gutachtery24.de`;
              const ical = buildAppleIcalString(eventInput, uid);
              externalEventId = await createAppleCalendarEvent(
                encryptedCreds,
                conn.calendarId ?? '',
                uid,
                ical
              );
            } else {
              return; // unknown provider — skip
            }

            // Upsert the event reference
            await prisma.partnerCalendarEvent.upsert({
              where: {
                connectionId_appointmentRequestId: {
                  connectionId: conn.id,
                  appointmentRequestId: input.appointmentRequestId
                }
              },
              create: {
                connectionId: conn.id,
                appointmentRequestId: input.appointmentRequestId,
                externalEventId,
                provider: conn.provider,
                syncedAt: new Date()
              },
              update: { externalEventId, syncedAt: new Date() }
            });

            await prisma.partnerCalendarConnection.update({
              where: { id: conn.id },
              data: { lastSyncedAt: new Date() }
            });
          } else if (input.action === 'delete') {
            const event = await prisma.partnerCalendarEvent.findUnique({
              where: {
                connectionId_appointmentRequestId: {
                  connectionId: conn.id,
                  appointmentRequestId: input.appointmentRequestId
                }
              }
            });
            if (!event) return; // no event to delete

            if (conn.provider === 'GOOGLE') {
              const token = await getValidAccessToken(conn);
              await deleteGoogleCalendarEvent(token, event.externalEventId);
            } else if (conn.provider === 'MICROSOFT') {
              const token = await getValidAccessToken(conn);
              await deleteMicrosoftCalendarEvent(token, event.externalEventId);
            } else if (conn.provider === 'APPLE') {
              const encryptedCreds = await getValidAccessToken(conn);
              await deleteAppleCalendarEvent(
                encryptedCreds,
                event.externalEventId
              );
            }

            await prisma.partnerCalendarEvent.delete({
              where: { id: event.id }
            });
          }
        } catch (err) {
          // Per-provider silent fail
          console.error(
            `[calendar-sync] provider=${conn.provider} appointmentRequestId=${input.appointmentRequestId}:`,
            err instanceof Error ? err.message : err
          );
        }
      })
    );
  } catch (err) {
    // Global catch — must never propagate
    console.error(
      '[calendar-sync] syncAppointmentToCalendars unexpected error:',
      err instanceof Error ? err.message : err
    );
  }
}
