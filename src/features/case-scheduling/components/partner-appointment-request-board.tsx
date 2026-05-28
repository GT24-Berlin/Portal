'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { PartnerAppointmentRequestRow } from '../types';

type ProposalDraft = {
  proposedStartAt: string;
  proposedEndAt: string;
  note: string;
};

function roleLabel(role: PartnerAppointmentRequestRow['role']) {
  return role === 'GUTACHTER' ? 'Gutachter' : 'Anwalt';
}

function statusLabel(status: PartnerAppointmentRequestRow['status']) {
  switch (status) {
    case 'REQUESTED':
      return 'Angefragt';
    case 'CONFIRMED':
      return 'Bestätigt';
    case 'DECLINED':
      return 'Abgelehnt';
    case 'ALTERNATIVE_PROPOSED':
      return 'Alternativtermin vorgeschlagen';
    case 'EXPIRED':
      return 'Abgelaufen';
    case 'CANCELLED':
      return 'Storniert';
    default:
      return status;
  }
}

function durationLabel(value: PartnerAppointmentRequestRow['duration']) {
  return value === 'MINUTES_15' ? '15 Minuten' : '30 Minuten';
}

function appointmentTypeLabel(
  value: PartnerAppointmentRequestRow['appointmentType']
) {
  return value === 'PHONE' ? 'Telefon' : 'Persönlich';
}

function fmtDateTime(value: string) {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(new Date(value));

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekday = get('weekday').replace(/[^A-Za-zÄÖÜäöüß]/g, '');
  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');

  return `${weekday}. ${day}.${month}.${year}, ${hour}:${minute}`;
}

function isOpenRequest(status: PartnerAppointmentRequestRow['status']) {
  return status === 'REQUESTED' || status === 'ALTERNATIVE_PROPOSED';
}

function emptyProposalDraft(): ProposalDraft {
  return {
    proposedStartAt: '',
    proposedEndAt: '',
    note: ''
  };
}

const shellClass =
  'border-border/60 bg-background/82 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]';

export default function PartnerAppointmentRequestBoard(props: {
  initialRequests: PartnerAppointmentRequestRow[];
}) {
  const [requests, setRequests] = useState(props.initialRequests);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>(
    {}
  );
  const [proposalOpen, setProposalOpen] = useState<Record<string, boolean>>({});
  const [proposalDrafts, setProposalDrafts] = useState<
    Record<string, ProposalDraft>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openRequests = useMemo(
    () => requests.filter((request) => isOpenRequest(request.status)),
    [requests]
  );
  const closedRequests = useMemo(
    () => requests.filter((request) => !isOpenRequest(request.status)),
    [requests]
  );

  function updateRequest(updated: PartnerAppointmentRequestRow) {
    setRequests((prev) =>
      prev.map((request) => (request.id === updated.id ? updated : request))
    );
  }

  async function postAction(
    request: PartnerAppointmentRequestRow,
    action: 'confirm' | 'decline' | 'propose-alternative'
  ) {
    setSavingId(request.id);
    setError(null);
    setSuccess(null);

    try {
      const body =
        action === 'propose-alternative'
          ? {
              note: proposalDrafts[request.id]?.note ?? '',
              proposedStartAt:
                proposalDrafts[request.id]?.proposedStartAt ?? '',
              proposedEndAt: proposalDrafts[request.id]?.proposedEndAt ?? ''
            }
          : {
              partnerResponseNote: responseNotes[request.id] ?? ''
            };

      const res = await fetch(
        `/api/case-scheduling/appointment-requests/${request.id}/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Action failed (${res.status})`);
      }

      if (data.request) {
        updateRequest(data.request as PartnerAppointmentRequestRow);
      }

      setSuccess(
        action === 'confirm'
          ? 'Anfrage bestätigt.'
          : action === 'decline'
            ? 'Anfrage abgelehnt.'
            : 'Alternativtermin vorgeschlagen.'
      );

      setResponseNotes((prev) => ({ ...prev, [request.id]: '' }));
      setProposalDrafts((prev) => ({
        ...prev,
        [request.id]: emptyProposalDraft()
      }));
      setProposalOpen((prev) => ({ ...prev, [request.id]: false }));
    } catch (e: any) {
      setError(e?.message ?? 'Aktion fehlgeschlagen');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className={`${shellClass} space-y-6 p-6 md:p-8`}>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='space-y-2'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Terminanfragen
          </div>
          <div className='font-heading text-foreground text-xl font-semibold tracking-tight'>
            Anfragen und Antwortvorschläge
          </div>
          <div className='text-muted-foreground text-sm leading-6'>
            Offene und bereits bearbeitete Anfragen für Gutachter und Anwalt in
            einer ruhigeren, produktisierten Oberfläche.
          </div>
        </div>

        <div className='border-border/60 bg-background/82 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)]'>
          {requests.length} Anfrage{requests.length === 1 ? '' : 'n'}
        </div>
      </div>

      {error ? (
        <div className='rounded-[24px] border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-[var(--shadow-soft)]'>
          {error}
        </div>
      ) : null}
      {success ? (
        <div className='rounded-[24px] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 shadow-[var(--shadow-soft)]'>
          {success}
        </div>
      ) : null}

      <div className='space-y-6'>
        <section className='space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                Offene Anfragen
              </div>
              <div className='text-foreground text-sm font-medium'>
                REQUESTED und ALTERNATIVE_PROPOSED
              </div>
            </div>
            <div className='text-muted-foreground text-xs'>
              {openRequests.length} Anfrage
              {openRequests.length === 1 ? '' : 'n'}
            </div>
          </div>

          {openRequests.length === 0 ? (
            <div className='border-border/60 bg-background/84 rounded-[24px] border border-dashed px-4 py-5 text-sm shadow-[var(--shadow-soft)]'>
              <div className='text-foreground text-sm font-medium'>
                Aktuell liegen keine offenen Terminanfragen vor.
              </div>
              <div className='text-muted-foreground mt-1 text-sm'>
                Sobald eine neue Anfrage eingeht, erscheint sie hier im neuen
                Partner-Flow.
              </div>
            </div>
          ) : (
            <div className='space-y-3'>
              {openRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  saving={savingId === request.id}
                  responseNote={responseNotes[request.id] ?? ''}
                  proposalOpen={proposalOpen[request.id] ?? false}
                  proposalDraft={
                    proposalDrafts[request.id] ?? emptyProposalDraft()
                  }
                  onResponseNoteChange={(value) =>
                    setResponseNotes((prev) => ({
                      ...prev,
                      [request.id]: value
                    }))
                  }
                  onToggleProposal={() =>
                    setProposalOpen((prev) => ({
                      ...prev,
                      [request.id]: !prev[request.id]
                    }))
                  }
                  onProposalDraftChange={(next) =>
                    setProposalDrafts((prev) => ({
                      ...prev,
                      [request.id]: next
                    }))
                  }
                  onAction={(action) => postAction(request, action)}
                />
              ))}
            </div>
          )}
        </section>

        {closedRequests.length > 0 ? (
          <section className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Weitere Anfragen
                </div>
                <div className='text-foreground text-sm font-medium'>
                  Bereits bearbeitete oder abgeschlossene Vorgänge
                </div>
              </div>
              <div className='text-muted-foreground text-xs'>
                {closedRequests.length} Anfrage
                {closedRequests.length === 1 ? '' : 'n'}
              </div>
            </div>

            <div className='space-y-3'>
              {closedRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  saving={false}
                  responseNote={responseNotes[request.id] ?? ''}
                  proposalOpen={false}
                  proposalDraft={
                    proposalDrafts[request.id] ?? emptyProposalDraft()
                  }
                  onResponseNoteChange={() => {}}
                  onToggleProposal={() => {}}
                  onProposalDraftChange={() => {}}
                  onAction={() => {}}
                  readOnly
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function RequestCard(props: {
  request: PartnerAppointmentRequestRow;
  saving: boolean;
  responseNote: string;
  proposalOpen: boolean;
  proposalDraft: ProposalDraft;
  onResponseNoteChange: (value: string) => void;
  onToggleProposal: () => void;
  onProposalDraftChange: (next: ProposalDraft) => void;
  onAction: (action: 'confirm' | 'decline' | 'propose-alternative') => void;
  readOnly?: boolean;
}) {
  const { request, readOnly } = props;
  const open = isOpenRequest(request.status);

  return (
    <article className='border-border/60 bg-background/84 rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='font-heading text-foreground text-base font-semibold tracking-tight'>
              {roleLabel(request.role)}
            </div>
            <span className='border-border/60 bg-background/80 rounded-full border px-2.5 py-1 text-xs font-medium shadow-[var(--shadow-soft)]'>
              {statusLabel(request.status)}
            </span>
          </div>
          <div className='text-muted-foreground text-sm'>
            {appointmentTypeLabel(request.appointmentType)} ·{' '}
            {durationLabel(request.duration)}
          </div>
          <div className='text-foreground text-sm'>
            Fall{' '}
            <Link
              href={`/dashboard/cases/${request.caseId}`}
              className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-2.5 py-1 underline underline-offset-4 transition-colors'
            >
              {request.caseNumber ?? '—'}
            </Link>
          </div>
        </div>

        <div className='text-muted-foreground text-xs'>
          Angefragt: {fmtDateTime(request.createdAt)}
        </div>
      </div>

      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        <div className='border-border/60 bg-background/90 rounded-[24px] border p-4 text-sm shadow-[var(--shadow-soft)]'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
            Angefragte Zeit
          </div>
          <div className='text-foreground mt-1 text-sm font-medium'>
            {fmtDateTime(request.requestedStartAt)} –{' '}
            {fmtDateTime(request.requestedEndAt)}
          </div>
        </div>
        <div className='border-border/60 bg-background/90 rounded-[24px] border p-4 text-sm shadow-[var(--shadow-soft)]'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
            Status
          </div>
          <div className='text-foreground mt-1 text-sm font-medium'>
            {statusLabel(request.status)}
          </div>
          <div className='text-muted-foreground mt-1 text-xs'>
            Läuft bis {fmtDateTime(request.expiresAt)}
          </div>
        </div>
      </div>

      {request.customerNote ? (
        <div className='border-border/60 bg-background/90 mt-4 rounded-[24px] border p-4 text-sm shadow-[var(--shadow-soft)]'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
            Kundennotiz
          </div>
          <div className='text-foreground mt-1 text-sm leading-6 whitespace-pre-wrap'>
            {request.customerNote}
          </div>
        </div>
      ) : null}

      {request.partnerResponseNote ? (
        <div className='border-border/60 bg-background/90 mt-4 rounded-[24px] border p-4 text-sm shadow-[var(--shadow-soft)]'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
            Eigene Notiz
          </div>
          <div className='text-foreground mt-1 text-sm leading-6 whitespace-pre-wrap'>
            {request.partnerResponseNote}
          </div>
        </div>
      ) : null}

      {request.latestProposalStartAt ? (
        <div className='border-border/60 bg-background/90 mt-4 rounded-[24px] border p-4 text-sm shadow-[var(--shadow-soft)]'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
            Letzter Alternativtermin
          </div>
          <div className='text-foreground mt-1 text-sm font-medium'>
            {fmtDateTime(request.latestProposalStartAt)} –{' '}
            {fmtDateTime(
              request.latestProposalEndAt ?? request.latestProposalStartAt
            )}
          </div>
          {request.latestProposalNote ? (
            <div className='text-muted-foreground mt-1 text-xs leading-5'>
              {request.latestProposalNote}
            </div>
          ) : null}
        </div>
      ) : null}

      {request.status === 'CONFIRMED' ? (
        <div className='mt-4 flex flex-wrap gap-2'>
          <a
            href={`/api/case-scheduling/appointment-requests/${request.id}/download`}
            download
            className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)] transition-colors'
          >
            Kalenderdatei herunterladen
          </a>
        </div>
      ) : null}

      {!readOnly && open ? (
        <div className='border-border/60 bg-background/90 mt-4 space-y-4 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
          <div className='space-y-2'>
            <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
              Partner-Notiz für Antwort oder Ablehnung
            </label>
            <textarea
              value={props.responseNote}
              onChange={(e) => props.onResponseNoteChange(e.target.value)}
              className='bg-background/90 border-border/60 focus-visible:ring-primary/20 min-h-20 w-full rounded-[20px] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
              placeholder='Optionale kurze Notiz'
            />
          </div>

          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              disabled={props.saving}
              onClick={() => props.onAction('confirm')}
              className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] disabled:opacity-50'
            >
              Bestätigen
            </button>
            <button
              type='button'
              disabled={props.saving}
              onClick={() => props.onAction('decline')}
              className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-colors disabled:opacity-50'
            >
              Ablehnen
            </button>
            <button
              type='button'
              disabled={props.saving}
              onClick={props.onToggleProposal}
              className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-colors disabled:opacity-50'
            >
              Alternativtermin vorschlagen
            </button>
          </div>

          {props.proposalOpen ? (
            <div className='border-border/60 bg-muted/10 space-y-4 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                  Alternativtermin
                </div>
                <div className='text-foreground text-sm font-medium'>
                  Ruhig formulierter Gegenvorschlag ohne Layoutbruch.
                </div>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Start
                  </label>
                  <input
                    type='datetime-local'
                    value={props.proposalDraft.proposedStartAt}
                    onChange={(e) =>
                      props.onProposalDraftChange({
                        ...props.proposalDraft,
                        proposedStartAt: e.target.value
                      })
                    }
                    className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-[20px] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Ende
                  </label>
                  <input
                    type='datetime-local'
                    value={props.proposalDraft.proposedEndAt}
                    onChange={(e) =>
                      props.onProposalDraftChange({
                        ...props.proposalDraft,
                        proposedEndAt: e.target.value
                      })
                    }
                    className='bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-[20px] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                  Notiz optional
                </label>
                <textarea
                  value={props.proposalDraft.note}
                  onChange={(e) =>
                    props.onProposalDraftChange({
                      ...props.proposalDraft,
                      note: e.target.value
                    })
                  }
                  className='bg-background/90 border-border/60 focus-visible:ring-primary/20 min-h-20 w-full rounded-[20px] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none'
                  placeholder='Warum dieser Alternativtermin passt'
                />
              </div>
              <button
                type='button'
                disabled={props.saving}
                onClick={() => props.onAction('propose-alternative')}
                className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] disabled:opacity-50'
              >
                Alternativtermin senden
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
