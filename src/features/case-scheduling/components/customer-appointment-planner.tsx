'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaseAppointmentRole } from '@prisma/client';
import type { AvailableAppointmentSlot } from '../types';

type AppointmentRoleSection = {
  role: CaseAppointmentRole;
  label: string;
  partnerName: string;
  companyName: string;
  addressLines: string[];
  slots: AppointmentSlotView[];
};

type AppointmentSlotView = AvailableAppointmentSlot & {
  displayRangeLabel: string;
  displayEndTimeLabel: string;
};

function slotKey(slot: AvailableAppointmentSlot) {
  return [
    slot.partnerId,
    slot.role,
    slot.appointmentType,
    slot.duration,
    slot.startAt,
    slot.endAt
  ].join('|');
}

function durationLabel(value: AvailableAppointmentSlot['duration']) {
  return value === 'MINUTES_15' ? '15 Minuten' : '30 Minuten';
}

function typeLabel(value: AvailableAppointmentSlot['appointmentType']) {
  return value === 'PHONE' ? 'Telefon' : 'Persönlich';
}

export default function CustomerAppointmentPlanner(props: {
  caseId: string;
  token: string;
  sections: AppointmentRoleSection[];
}) {
  const router = useRouter();
  const [selectedByRole, setSelectedByRole] = useState<
    Partial<Record<CaseAppointmentRole, string>>
  >({});
  const [notesByRole, setNotesByRole] = useState<
    Partial<Record<CaseAppointmentRole, string>>
  >({});
  const [savingRole, setSavingRole] = useState<CaseAppointmentRole | null>(
    null
  );
  const [messageByRole, setMessageByRole] = useState<
    Partial<Record<CaseAppointmentRole, { kind: 'ok' | 'error'; text: string }>>
  >({});

  const selectedSlotByRole = useMemo(() => {
    const map = new Map<CaseAppointmentRole, AvailableAppointmentSlot>();

    for (const section of props.sections) {
      const selectedKey = selectedByRole[section.role];
      const slot =
        section.slots.find((item) => slotKey(item) === selectedKey) ?? null;
      if (slot) {
        map.set(section.role, slot);
      }
    }

    return map;
  }, [props.sections, selectedByRole]);

  async function submitSection(role: CaseAppointmentRole) {
    const slot = selectedSlotByRole.get(role);
    if (!slot) {
      setMessageByRole((prev) => ({
        ...prev,
        [role]: { kind: 'error', text: 'Bitte zuerst einen Slot auswählen.' }
      }));
      return;
    }

    setSavingRole(role);
    setMessageByRole((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });

    try {
      const res = await fetch('/api/case-scheduling/appointment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token: props.token,
          caseId: props.caseId,
          partnerId: slot.partnerId,
          role: slot.role,
          appointmentType: slot.appointmentType,
          duration: slot.duration,
          requestedStartAt: slot.startAt,
          requestedEndAt: slot.endAt,
          customerNote: notesByRole[role] ?? ''
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      setMessageByRole((prev) => ({
        ...prev,
        [role]: { kind: 'ok', text: 'Terminanfrage erfolgreich gesendet.' }
      }));
      setNotesByRole((prev) => ({ ...prev, [role]: '' }));
      setSelectedByRole((prev) => ({ ...prev, [role]: slotKey(slot) }));
      router.refresh();
    } catch (error) {
      setMessageByRole((prev) => ({
        ...prev,
        [role]: {
          kind: 'error',
          text: error instanceof Error ? error.message : 'Senden fehlgeschlagen'
        }
      }));
    } finally {
      setSavingRole(null);
    }
  }

  return (
    <div className='space-y-4'>
      <div className='border-border/60 bg-card/95 grid gap-3 rounded-[28px] border p-5 shadow-sm md:grid-cols-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Booking-Modul
          </div>
          <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Terminplanung
          </div>
          <div className='text-muted-foreground text-sm'>
            Freie Slots werden nur angefragt, nicht direkt gebucht.
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Flow
          </div>
          <div className='text-foreground text-sm font-medium'>
            Gutachter und Anwalt sind getrennte Buchungslanes.
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Hinweis
          </div>
          <div className='text-foreground text-sm font-medium'>
            Externe Kalender-Synchronisation folgt später.
          </div>
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {props.sections.map((section) => {
          const selectedKey = selectedByRole[section.role];
          const selectedSlot = section.slots.find(
            (item) => slotKey(item) === selectedKey
          );

          return (
            <section
              key={section.role}
              className='border-border/60 bg-card/95 overflow-hidden rounded-[28px] border shadow-sm'
            >
              <div className='border-border/60 bg-muted/15 border-b px-5 py-4'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  {section.label}
                </div>
                <h2 className='font-heading text-foreground text-xl font-semibold tracking-tight'>
                  {section.partnerName || 'Partnerdaten noch nicht hinterlegt'}
                </h2>
                <p className='text-muted-foreground text-sm'>
                  {section.companyName || 'Unternehmensdaten folgen.'}
                </p>
              </div>

              <div className='space-y-4 p-5'>
                {section.addressLines.length > 0 ? (
                  <div className='border-border/60 bg-background/80 text-foreground grid gap-2 rounded-2xl border p-4 text-sm shadow-sm'>
                    {section.addressLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                ) : null}

                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-foreground text-sm font-medium'>
                      Verfügbare anfragbare Slots
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      Rolle bleibt getrennt, Slot bitte nur einmal anfragen.
                    </div>
                  </div>
                  <div className='border-border/60 bg-background/90 text-muted-foreground rounded-full border px-3 py-1.5 text-xs shadow-sm'>
                    {section.slots.length} Slot(s)
                  </div>
                </div>

                {section.slots.length === 0 ? (
                  <div className='border-border/60 bg-muted/10 text-muted-foreground rounded-2xl border border-dashed p-5 text-sm shadow-sm'>
                    Für diese Rolle sind aktuell keine anfragbaren Slots
                    hinterlegt.
                  </div>
                ) : (
                  <div className='space-y-2.5'>
                    {section.slots.map((slot) => {
                      const active = selectedKey === slotKey(slot);

                      return (
                        <button
                          key={slotKey(slot)}
                          type='button'
                          onClick={() =>
                            setSelectedByRole((prev) => ({
                              ...prev,
                              [section.role]: slotKey(slot)
                            }))
                          }
                          className={`w-full rounded-2xl border px-4 py-4 text-left shadow-sm transition-all ${
                            active
                              ? 'border-primary/40 bg-primary/5 ring-primary/15 ring-1'
                              : 'border-border/60 bg-background/80 hover:border-foreground/20 hover:bg-muted/20'
                          }`}
                        >
                          <div className='flex flex-wrap items-start justify-between gap-4'>
                            <div className='space-y-2'>
                              <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                                {slot.displayRangeLabel} –{' '}
                                {slot.displayEndTimeLabel}
                              </div>
                              <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm'>
                                <span>{typeLabel(slot.appointmentType)}</span>
                                <span className='text-border'>·</span>
                                <span>{durationLabel(slot.duration)}</span>
                              </div>
                            </div>

                            <div className='border-border/60 bg-background/90 text-muted-foreground rounded-full border px-3 py-1.5 text-xs shadow-sm'>
                              {active ? 'Ausgewählt' : 'anfragbar'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className='border-border/60 bg-background/80 border-t p-5'>
                <div className='border-border/60 bg-card/95 space-y-4 rounded-2xl border p-4 shadow-sm'>
                  <div className='grid gap-3 text-sm md:grid-cols-2'>
                    <div className='border-border/60 bg-background/80 rounded-2xl border p-3 shadow-sm'>
                      <div className='text-muted-foreground text-xs tracking-[0.14em] uppercase'>
                        Terminart
                      </div>
                      <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                        {selectedSlot
                          ? typeLabel(selectedSlot.appointmentType)
                          : 'Bitte Slot auswählen'}
                      </div>
                    </div>
                    <div className='border-border/60 bg-background/80 rounded-2xl border p-3 shadow-sm'>
                      <div className='text-muted-foreground text-xs tracking-[0.14em] uppercase'>
                        Dauer
                      </div>
                      <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
                        {selectedSlot
                          ? durationLabel(selectedSlot.duration)
                          : 'Bitte Slot auswählen'}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-foreground text-sm font-medium'>
                      Kurze Anmerkung optional
                    </label>
                    <textarea
                      value={notesByRole[section.role] ?? ''}
                      onChange={(e) =>
                        setNotesByRole((prev) => ({
                          ...prev,
                          [section.role]: e.target.value
                        }))
                      }
                      className='bg-background/80 border-border/60 focus-visible:ring-primary/20 min-h-28 w-full rounded-2xl border px-3 py-2.5 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                      placeholder='Zum Beispiel Erreichbarkeit, Hinweise oder Rückfragen'
                    />
                  </div>

                  {messageByRole[section.role] ? (
                    <div
                      className={`rounded-2xl border px-3 py-2.5 text-sm shadow-sm ${
                        messageByRole[section.role]?.kind === 'ok'
                          ? 'border-emerald-300/70 bg-emerald-50/80 text-emerald-900'
                          : 'border-red-300/70 bg-red-50/80 text-red-900'
                      }`}
                    >
                      {messageByRole[section.role]?.text}
                    </div>
                  ) : null}

                  <button
                    type='button'
                    onClick={() => submitSection(section.role)}
                    disabled={savingRole === section.role || !selectedSlot}
                    className='bg-foreground text-background inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {savingRole === section.role
                      ? 'Sende…'
                      : 'Terminanfrage absenden'}
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
