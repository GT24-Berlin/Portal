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
    <div className='space-y-6 rounded-xl border bg-white p-6 shadow-sm'>
      <div className='space-y-1'>
        <div className='text-lg font-semibold'>Terminanfragen</div>
        <div className='text-muted-foreground text-sm'>
          Offene Anfragen für Gutachter und Anwalt. Externe Benachrichtigungen
          kommen in einem späteren Schritt.
        </div>
      </div>

      {error ? <div className='text-sm text-red-500'>{error}</div> : null}
      {success ? <div className='text-sm text-green-600'>{success}</div> : null}

      <div className='space-y-6'>
        <section className='space-y-3'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <div className='text-sm font-medium'>Offene Anfragen</div>
              <div className='text-muted-foreground text-xs'>
                REQUESTED und ALTERNATIVE_PROPOSED
              </div>
            </div>
            <div className='text-muted-foreground text-xs'>
              {openRequests.length} Anfrage(n)
            </div>
          </div>

          {openRequests.length === 0 ? (
            <div className='rounded-lg border border-dashed p-4 text-sm text-neutral-600'>
              Aktuell liegen keine offenen Terminanfragen vor.
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
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-sm font-medium'>Weitere Anfragen</div>
                <div className='text-muted-foreground text-xs'>
                  Bereits bearbeitete oder abgeschlossene Vorgänge
                </div>
              </div>
              <div className='text-muted-foreground text-xs'>
                {closedRequests.length} Anfrage(n)
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
    </div>
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
    <article className='rounded-xl border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='text-base font-semibold'>
              {roleLabel(request.role)}
            </div>
            <span className='rounded-full border px-2 py-0.5 text-xs text-neutral-600'>
              {statusLabel(request.status)}
            </span>
          </div>
          <div className='text-sm text-neutral-600'>
            {appointmentTypeLabel(request.appointmentType)} ·{' '}
            {durationLabel(request.duration)}
          </div>
          <div className='text-sm text-neutral-700'>
            Fall{' '}
            <Link
              href={`/dashboard/cases/${request.caseId}`}
              className='underline underline-offset-4'
            >
              {request.caseNumber ?? '—'}
            </Link>
          </div>
        </div>

        <div className='text-muted-foreground text-xs'>
          Angefragt: {fmtDateTime(request.createdAt)}
        </div>
      </div>

      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        <div className='rounded-lg bg-neutral-50 p-3 text-sm'>
          <div className='text-xs font-medium text-neutral-500'>
            Angefragte Zeit
          </div>
          <div className='mt-1 font-medium text-neutral-950'>
            {fmtDateTime(request.requestedStartAt)} –{' '}
            {fmtDateTime(request.requestedEndAt)}
          </div>
        </div>
        <div className='rounded-lg bg-neutral-50 p-3 text-sm'>
          <div className='text-xs font-medium text-neutral-500'>Status</div>
          <div className='mt-1 font-medium text-neutral-950'>
            {statusLabel(request.status)}
          </div>
          <div className='text-muted-foreground mt-1 text-xs'>
            Läuft bis {fmtDateTime(request.expiresAt)}
          </div>
        </div>
      </div>

      {request.customerNote ? (
        <div className='mt-3 rounded-lg border bg-white p-3 text-sm'>
          <div className='text-xs font-medium text-neutral-500'>
            Kundennotiz
          </div>
          <div className='mt-1 whitespace-pre-wrap text-neutral-700'>
            {request.customerNote}
          </div>
        </div>
      ) : null}

      {request.partnerResponseNote ? (
        <div className='mt-3 rounded-lg border bg-white p-3 text-sm'>
          <div className='text-xs font-medium text-neutral-500'>
            Eigene Notiz
          </div>
          <div className='mt-1 whitespace-pre-wrap text-neutral-700'>
            {request.partnerResponseNote}
          </div>
        </div>
      ) : null}

      {request.latestProposalStartAt ? (
        <div className='mt-3 rounded-lg border bg-white p-3 text-sm'>
          <div className='text-xs font-medium text-neutral-500'>
            Letzter Alternativtermin
          </div>
          <div className='mt-1 font-medium text-neutral-950'>
            {fmtDateTime(request.latestProposalStartAt)} –{' '}
            {fmtDateTime(
              request.latestProposalEndAt ?? request.latestProposalStartAt
            )}
          </div>
          {request.latestProposalNote ? (
            <div className='text-muted-foreground mt-1 text-xs'>
              {request.latestProposalNote}
            </div>
          ) : null}
        </div>
      ) : null}

      {request.status === 'CONFIRMED' ? (
        <div className='mt-3 flex flex-wrap gap-2'>
          <a
            href={`/api/case-scheduling/appointment-requests/${request.id}/download`}
            download
            className='rounded-md border px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-50'
          >
            Kalenderdatei herunterladen
          </a>
        </div>
      ) : null}

      {!readOnly && open ? (
        <div className='mt-4 space-y-4 rounded-lg border p-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>
              Partner-Notiz für Antwort oder Ablehnung
            </label>
            <textarea
              value={props.responseNote}
              onChange={(e) => props.onResponseNoteChange(e.target.value)}
              className='bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm'
              placeholder='Optionale kurze Notiz'
            />
          </div>

          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              disabled={props.saving}
              onClick={() => props.onAction('confirm')}
              className='bg-foreground text-background rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50'
            >
              Bestätigen
            </button>
            <button
              type='button'
              disabled={props.saving}
              onClick={() => props.onAction('decline')}
              className='rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50'
            >
              Ablehnen
            </button>
            <button
              type='button'
              disabled={props.saving}
              onClick={props.onToggleProposal}
              className='rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50'
            >
              Alternativtermin vorschlagen
            </button>
          </div>

          {props.proposalOpen ? (
            <div className='space-y-3 rounded-lg bg-neutral-50 p-4'>
              <div className='text-sm font-medium'>Alternativtermin</div>
              <div className='grid gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <label className='text-xs font-medium'>Start</label>
                  <input
                    type='datetime-local'
                    value={props.proposalDraft.proposedStartAt}
                    onChange={(e) =>
                      props.onProposalDraftChange({
                        ...props.proposalDraft,
                        proposedStartAt: e.target.value
                      })
                    }
                    className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  />
                </div>
                <div className='space-y-1'>
                  <label className='text-xs font-medium'>Ende</label>
                  <input
                    type='datetime-local'
                    value={props.proposalDraft.proposedEndAt}
                    onChange={(e) =>
                      props.onProposalDraftChange({
                        ...props.proposalDraft,
                        proposedEndAt: e.target.value
                      })
                    }
                    className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  />
                </div>
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-medium'>Notiz optional</label>
                <textarea
                  value={props.proposalDraft.note}
                  onChange={(e) =>
                    props.onProposalDraftChange({
                      ...props.proposalDraft,
                      note: e.target.value
                    })
                  }
                  className='bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm'
                  placeholder='Warum dieser Alternativtermin passt'
                />
              </div>
              <button
                type='button'
                disabled={props.saving}
                onClick={() => props.onAction('propose-alternative')}
                className='bg-foreground text-background rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50'
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
