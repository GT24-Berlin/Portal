'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type LeadCase = {
  id: string;
  token: string;
  caseNumber: string | null;
  createdAt: string | Date;
};

export type LeadRow = {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  status: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  zipCode: string | null;
  city: string | null;
  region: string | null;
  source: string | null;
  externalId: string | null;
  case: LeadCase | null;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  houseNumber: '',
  zipCode: '',
  city: ''
};

const statusLabels: Record<string, string> = {
  NEW: 'Neu',
  CONTACTED: 'Kontaktiert',
  APPOINTMENT: 'Termin',
  IN_PROGRESS: 'In Bearbeitung',
  CLOSED: 'Abgeschlossen'
};

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function leadLabel(lead: LeadRow) {
  return [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.name;
}

export default function LeadsAdminPanel(props: { initialLeads: LeadRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [busyCreate, setBusyCreate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createLead() {
    setBusyCreate(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error || `Lead konnte nicht erstellt werden (${res.status})`
        );
      }

      setForm(emptyForm);
      setNotice('Lead wurde erstellt.');
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler beim Erstellen des Leads');
    } finally {
      setBusyCreate(false);
    }
  }

  async function createCase(leadId: string) {
    setBusyLeadId(leadId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/admin/leads/${leadId}/case`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error || `Case konnte nicht erzeugt werden (${res.status})`
        );
      }

      setNotice(
        data?.alreadyExisted
          ? 'Case existierte bereits.'
          : 'Case wurde erzeugt.'
      );
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Unbekannter Fehler beim Case-Erzeugen');
    } finally {
      setBusyLeadId(null);
    }
  }

  const leads = props.initialLeads ?? [];

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Lead erstellen</CardTitle>
          <CardDescription>
            Nur für Admins. Neue Leads werden hier angelegt und können danach
            direkt in einen Case umgewandelt werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='space-y-4'
            onSubmit={(e) => {
              e.preventDefault();
              void createLead();
            }}
          >
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Vorname</label>
                <Input
                  autoComplete='given-name'
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Nachname</label>
                <Input
                  autoComplete='family-name'
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>E-Mail</label>
                <Input
                  type='email'
                  autoComplete='email'
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Telefonnummer</label>
                <Input
                  autoComplete='tel'
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='text-sm font-medium'>Straße</label>
                <Input
                  autoComplete='street-address'
                  value={form.street}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, street: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Hausnummer</label>
                <Input
                  value={form.houseNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      houseNumber: e.target.value
                    }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Plz</label>
                <Input
                  autoComplete='postal-code'
                  value={form.zipCode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, zipCode: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='text-sm font-medium'>Ort</label>
                <Input
                  autoComplete='address-level2'
                  value={form.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <Button type='submit' disabled={busyCreate}>
                {busyCreate ? 'Speichere...' : 'Lead erstellen'}
              </Button>
              {notice ? (
                <span className='text-sm text-emerald-600'>{notice}</span>
              ) : null}
              {error ? (
                <span className='text-sm text-red-500'>{error}</span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Erstellte Leads bleiben hier sichtbar und können direkt in einen
            Case überführt werden.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {leads.length === 0 ? (
            <div className='text-muted-foreground text-sm'>
              Noch keine Leads vorhanden.
            </div>
          ) : (
            leads.map((lead) => {
              const hasCase = Boolean(lead.case);

              return (
                <div
                  key={lead.id}
                  className='flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between'
                >
                  <div className='min-w-0 space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='font-medium'>{leadLabel(lead)}</div>
                      <Badge variant='outline'>
                        {statusLabels[lead.status] ?? lead.status}
                      </Badge>
                      {hasCase ? <Badge>Case vorhanden</Badge> : null}
                    </div>
                    <div className='text-muted-foreground text-sm'>
                      {lead.email ?? '—'} · {lead.phone ?? '—'}
                    </div>
                    <div className='text-muted-foreground text-sm'>
                      {lead.street ?? '—'} {lead.houseNumber ?? ''},{' '}
                      {lead.zipCode ?? '—'} {lead.city ?? '—'}
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      Erstellt am {formatDate(lead.createdAt)}
                    </div>
                    {lead.case ? (
                      <div className='text-sm'>
                        Case:{' '}
                        <Link
                          className='underline underline-offset-4'
                          href={`/dashboard/cases/${lead.case.id}`}
                        >
                          {lead.case.caseNumber ?? lead.case.id.slice(0, 8)}
                        </Link>
                        <span className='text-muted-foreground ml-2'>
                          · Public:{' '}
                          <Link
                            className='underline underline-offset-4'
                            href={`/case/${lead.case.token}`}
                            target='_blank'
                            rel='noreferrer'
                          >
                            öffnen
                          </Link>
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className='flex shrink-0 flex-wrap gap-2'>
                    <Button
                      variant='outline'
                      onClick={() => createCase(lead.id)}
                      disabled={busyLeadId === lead.id || hasCase}
                    >
                      {busyLeadId === lead.id
                        ? 'Erzeuge Case...'
                        : hasCase
                          ? 'Case bereits vorhanden'
                          : 'Case erzeugen'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
