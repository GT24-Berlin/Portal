'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PartnerProfileDto, PartnerProfileFormData } from '../types';

function toFormData(profile: PartnerProfileDto): PartnerProfileFormData {
  return {
    companyName: profile.companyName,
    legalForm: profile.legalForm,
    contactPerson: profile.contactPerson,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    logoUrl: profile.logoUrl,
    street: profile.street,
    houseNumber: profile.houseNumber,
    zipCode: profile.zipCode,
    city: profile.city,
    country: profile.country,
    region: profile.region
  };
}

const shellClass =
  'border-border/60 bg-background/82 overflow-hidden rounded-[32px] border shadow-[var(--shadow-soft)]';

const fieldClass =
  'bg-background/90 border-border/60 focus-visible:ring-primary/20 w-full rounded-[24px] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] transition-colors focus-visible:ring-2 focus-visible:outline-none';

const navItemClass =
  'border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-[var(--shadow-soft)] transition-colors';

export default function PartnerProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<'GUTACHTER' | 'ANWALT' | ''>('');
  const [form, setForm] = useState<PartnerProfileFormData>({
    companyName: '',
    legalForm: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    country: '',
    region: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch('/api/partner-profile', {
          cache: 'no-store',
          credentials: 'include'
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || `Load failed (${res.status})`);
        }

        if (!alive) return;

        setRole(data.profile?.role ?? '');
        setForm(toFormData(data.profile));
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'Fehler beim Laden des Partnerprofils');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  function update<K extends keyof PartnerProfileFormData>(
    key: K,
    value: PartnerProfileFormData[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/partner-profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      setSuccess('Profil erfolgreich gespeichert.');
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id='partner-profile-section' className='space-y-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Partnerprofil
          </div>
          <div className='font-heading text-foreground text-lg font-semibold tracking-tight'>
            Unternehmens- und Kontaktdaten für dein Portalprofil
          </div>
        </div>

        <div className='border-border/60 bg-background/82 rounded-full border px-3.5 py-2 text-xs font-medium tracking-[0.01em] shadow-[var(--shadow-soft)]'>
          Rolle: <span className='font-mono'>{role || '—'}</span>
        </div>
      </div>

      <div className='border-border/60 bg-background/82 flex flex-wrap gap-2 rounded-[28px] border p-2.5 shadow-[var(--shadow-soft)]'>
        <a href='#partner-profile-section' className={navItemClass}>
          Profil
        </a>
        <a href='#partner-collaboration-section' className={navItemClass}>
          Fallpartner
        </a>
        <Link
          href='/dashboard/partner-profile/calendar'
          className={navItemClass}
        >
          Kalender
        </Link>
        <a href='#partner-pricing-section' className={navItemClass}>
          Preispaket
        </a>
      </div>

      {loading ? (
        <div className={`${shellClass} space-y-5 p-6`}>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='space-y-2'>
              <div className='bg-muted/60 h-4 w-32 animate-pulse rounded-full' />
              <div className='bg-muted/50 h-3 w-72 animate-pulse rounded-full' />
            </div>
            <div className='bg-muted/60 h-8 w-24 animate-pulse rounded-full' />
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='border-border/60 bg-background/82 h-24 rounded-[24px] border shadow-[var(--shadow-soft)]' />
            <div className='border-border/60 bg-background/82 h-24 rounded-[24px] border shadow-[var(--shadow-soft)]' />
            <div className='border-border/60 bg-background/82 h-24 rounded-[24px] border shadow-[var(--shadow-soft)] md:col-span-2' />
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className='space-y-6'>
          <div className={`${shellClass} space-y-6 p-6 md:p-8`}>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                  Unternehmensname
                </label>
                <input
                  className={fieldClass}
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                  Rechtsform
                </label>
                <input
                  className={fieldClass}
                  value={form.legalForm}
                  onChange={(e) => update('legalForm', e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                  Ansprechpartner
                </label>
                <input
                  className={fieldClass}
                  value={form.contactPerson}
                  onChange={(e) => update('contactPerson', e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                  E-Mail
                </label>
                <input
                  className={fieldClass}
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                  Telefon
                </label>
                <input
                  className={fieldClass}
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                  Website
                </label>
                <input
                  className={fieldClass}
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                />
              </div>

              <div className='space-y-3 md:col-span-2'>
                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Logo URL
                  </label>
                  <input
                    className={fieldClass}
                    value={form.logoUrl}
                    onChange={(e) => update('logoUrl', e.target.value)}
                    placeholder='https://...'
                  />
                </div>

                {form.logoUrl.trim() ? (
                  <div className='border-border/60 bg-background/84 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                    <div className='text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase'>
                      Logo-Vorschau
                    </div>

                    <div className='border-border/60 bg-background/90 flex h-32 w-full items-center justify-center overflow-hidden rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                      <img
                        src={form.logoUrl}
                        alt='Partner Logo'
                        className='max-h-full max-w-full object-contain'
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className='border-border/60 bg-background/84 space-y-4 rounded-[28px] border p-5 shadow-[var(--shadow-soft)]'>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Adresse
                </div>
                <div className='text-foreground text-sm font-medium'>
                  Postadresse und regionale Zuordnung in einer ruhigen Sektion.
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Straße
                  </label>
                  <input
                    className={fieldClass}
                    value={form.street}
                    onChange={(e) => update('street', e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Hausnummer
                  </label>
                  <input
                    className={fieldClass}
                    value={form.houseNumber}
                    onChange={(e) => update('houseNumber', e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    PLZ
                  </label>
                  <input
                    className={fieldClass}
                    value={form.zipCode}
                    onChange={(e) => update('zipCode', e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Ort
                  </label>
                  <input
                    className={fieldClass}
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Land
                  </label>
                  <input
                    className={fieldClass}
                    value={form.country}
                    onChange={(e) => update('country', e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase'>
                    Region
                  </label>
                  <input
                    className={fieldClass}
                    value={form.region}
                    onChange={(e) => update('region', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error ? (
              <div className='rounded-[24px] border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-900 shadow-[var(--shadow-soft)]'>
                {error}
              </div>
            ) : null}
            {success ? (
              <div className='rounded-[24px] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 shadow-[var(--shadow-soft)]'>
                {success}
              </div>
            ) : null}

            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={saving}
                className='bg-foreground text-background rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] disabled:opacity-60'
              >
                {saving ? 'Speichern…' : 'Profil speichern'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
