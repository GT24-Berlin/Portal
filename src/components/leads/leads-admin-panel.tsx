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
      <Card className='border-border/60 bg-card/95 overflow-hidden shadow-sm'>
        <CardHeader className='border-border/60 bg-muted/15 border-b'>
          <CardTitle className='font-heading text-foreground tracking-tight'>
            Lead erstellen
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            Nur für Admins. Neue Leads werden hier angelegt und können danach
            direkt in einen Case umgewandelt werden.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <form
            className='space-y-4'
            onSubmit={(e) => {
              e.preventDefault();
              void createLead();
            }}
          >
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-foreground text-sm font-medium'>
                  Vorname
                </label>
                <Input
                  autoComplete='given-name'
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-foreground text-sm font-medium'>
                  Nachname
                </label>
                <Input
                  autoComplete='family-name'
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-foreground text-sm font-medium'>
                  E-Mail
                </label>
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
                <label className='text-foreground text-sm font-medium'>
                  Telefonnummer
                </label>
                <Input
                  autoComplete='tel'
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='text-foreground text-sm font-medium'>
                  Straße
                </label>
                <Input
                  autoComplete='street-address'
                  value={form.street}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, street: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <label className='text-foreground text-sm font-medium'>
                  Hausnummer
                </label>
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
                <label className='text-foreground text-sm font-medium'>
                  Plz
                </label>
                <Input
                  autoComplete='postal-code'
                  value={form.zipCode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, zipCode: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='text-foreground text-sm font-medium'>
                  Ort
                </label>
                <Input
                  autoComplete='address-level2'
                  value={form.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className='border-border/60 flex flex-wrap items-center gap-3 border-t pt-4'>
              <Button type='submit' disabled={busyCreate}>
                {busyCreate ? 'Speichere...' : 'Lead erstellen'}
              </Button>
              {notice ? (
                <span className='rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-sm text-emerald-900 shadow-sm'>
                  {notice}
                </span>
              ) : null}
              {error ? (
                <span className='rounded-full border border-red-200/70 bg-red-50/80 px-3 py-1.5 text-sm text-red-900 shadow-sm'>
                  {error}
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className='border-border/60 bg-card/95 overflow-hidden shadow-sm'>
        <CardHeader className='border-border/60 bg-muted/15 border-b'>
          <CardTitle className='font-heading text-foreground tracking-tight'>
            Leads
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            Erstellte Leads bleiben hier sichtbar und können direkt in einen
            Case überführt werden.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {leads.length === 0 ? (
            <div className='text-muted-foreground border-border/60 bg-muted/10 rounded-2xl border border-dashed px-4 py-6 text-sm shadow-sm'>
              Noch keine Leads vorhanden.
            </div>
          ) : (
            <>
              <div className='bg-muted/10 text-muted-foreground border-border/60 hidden grid-cols-12 gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium tracking-[0.16em] uppercase shadow-sm md:grid'>
                <div className='col-span-3'>Lead</div>
                <div className='col-span-3'>Kontakt</div>
                <div className='col-span-3'>Adresse</div>
                <div className='col-span-1'>Status</div>
                <div className='col-span-2 text-right'>Aktionen</div>
              </div>

              <div className='space-y-3'>
                {leads.map((lead) => {
                  const hasCase = Boolean(lead.case);
                  const leadName = leadLabel(lead);
                  const leadAddress = [
                    lead.street ?? '—',
                    lead.houseNumber ?? '',
                    lead.zipCode ?? '—',
                    lead.city ?? '—'
                  ]
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                  return (
                    <div
                      key={lead.id}
                      className='border-border/60 bg-background/80 hover:bg-muted/20 grid gap-4 rounded-2xl border p-4 shadow-sm transition-colors md:grid-cols-12 md:items-start md:gap-3'
                    >
                      <div className='space-y-2 md:col-span-3'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <div className='text-foreground font-medium'>
                            {leadName}
                          </div>
                        </div>
                        <div className='text-muted-foreground text-xs leading-5'>
                          Erstellt am {formatDate(lead.createdAt)}
                        </div>
                        {lead.source ? (
                          <div className='text-muted-foreground text-xs leading-5'>
                            Quelle: {lead.source}
                          </div>
                        ) : null}
                        {hasCase ? <Badge>Case vorhanden</Badge> : null}
                      </div>

                      <div className='space-y-2 md:col-span-3'>
                        <div className='text-foreground text-sm'>
                          {lead.email ?? '—'}
                        </div>
                        <div className='text-muted-foreground text-sm'>
                          {lead.phone ?? '—'}
                        </div>
                        {lead.externalId ? (
                          <div className='text-muted-foreground text-xs leading-5'>
                            Extern: {lead.externalId}
                          </div>
                        ) : null}
                      </div>

                      <div className='space-y-2 md:col-span-3'>
                        <div className='text-foreground text-sm'>
                          {leadAddress}
                        </div>
                        {lead.region ? (
                          <div className='text-muted-foreground text-xs leading-5'>
                            Region: {lead.region}
                          </div>
                        ) : null}
                      </div>

                      <div className='flex items-start md:col-span-1'>
                        <Badge
                          variant='secondary'
                          className='bg-background/80 px-3 py-1.5 shadow-sm'
                        >
                          {statusLabels[lead.status] ?? lead.status}
                        </Badge>
                      </div>

                      <div className='flex flex-col gap-2 md:col-span-2 md:items-end'>
                        {lead.case ? (
                          <Link
                            className='border-border/60 bg-background/80 decoration-muted-foreground/40 hover:bg-muted hover:decoration-foreground/70 inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm underline underline-offset-4 shadow-sm transition-colors'
                            href={`/dashboard/cases/${lead.case.id}`}
                          >
                            {lead.case.caseNumber ?? '—'}
                          </Link>
                        ) : null}
                        {lead.case ? (
                          <Link
                            className='text-muted-foreground border-border/60 bg-background/80 hover:bg-muted hover:text-foreground inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm shadow-sm transition-colors'
                            href={`/case/${lead.case.token}`}
                            target='_blank'
                            rel='noreferrer'
                          >
                            Public öffnen
                          </Link>
                        ) : null}
                        <Button
                          variant='outline'
                          className='border-border/60 bg-background/80 rounded-full shadow-sm'
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
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
