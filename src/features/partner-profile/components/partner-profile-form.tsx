'use client';

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
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-sm font-medium'>Partnerprofil</div>
          <div className='text-muted-foreground text-xs'>
            Unternehmens- und Kontaktdaten für dein Portalprofil
          </div>
        </div>

        <div className='text-muted-foreground text-xs'>
          Rolle: <span className='font-mono'>{role || '—'}</span>
        </div>
      </div>

      <div className='flex flex-wrap gap-2 rounded-lg border p-2'>
        <a
          href='#partner-profile-section'
          className='bg-foreground text-background rounded-md px-3 py-2 text-xs font-medium transition-opacity hover:opacity-90'
        >
          Profil
        </a>
        <a
          href='#partner-collaboration-section'
          className='text-muted-foreground hover:bg-muted rounded-md border px-3 py-2 text-xs font-medium transition-colors'
        >
          Fallpartner
        </a>
        <a
          href='#partner-pricing-section'
          className='text-muted-foreground hover:bg-muted rounded-md border px-3 py-2 text-xs font-medium transition-colors'
        >
          Preispaket
        </a>
      </div>

      {loading ? (
        <div className='text-muted-foreground rounded-lg border p-6 text-sm'>
          Profil wird geladen…
        </div>
      ) : (
        <form onSubmit={onSubmit} className='space-y-6 rounded-lg border p-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <label className='mb-1 block text-xs font-medium'>
                Unternehmensname
              </label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
              />
            </div>

            <div>
              <label className='mb-1 block text-xs font-medium'>
                Rechtsform
              </label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={form.legalForm}
                onChange={(e) => update('legalForm', e.target.value)}
              />
            </div>

            <div>
              <label className='mb-1 block text-xs font-medium'>
                Ansprechpartner
              </label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={form.contactPerson}
                onChange={(e) => update('contactPerson', e.target.value)}
              />
            </div>

            <div>
              <label className='mb-1 block text-xs font-medium'>E-Mail</label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>

            <div>
              <label className='mb-1 block text-xs font-medium'>Telefon</label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </div>

            <div>
              <label className='mb-1 block text-xs font-medium'>Website</label>
              <input
                className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
              />
            </div>

            <div className='space-y-3 md:col-span-2'>
              <div>
                <label className='mb-1 block text-xs font-medium'>
                  Logo URL
                </label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={form.logoUrl}
                  onChange={(e) => update('logoUrl', e.target.value)}
                  placeholder='https://...'
                />
              </div>

              {form.logoUrl.trim() ? (
                <div className='rounded-lg border p-4'>
                  <div className='text-muted-foreground mb-2 text-xs font-medium'>
                    Logo-Vorschau
                  </div>

                  <div className='flex h-28 w-full items-center justify-center overflow-hidden rounded-md border bg-white p-4'>
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

          <div className='space-y-3'>
            <div className='text-sm font-medium'>Adresse</div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1 block text-xs font-medium'>Straße</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={form.street}
                  onChange={(e) => update('street', e.target.value)}
                />
              </div>

              <div>
                <label className='mb-1 block text-xs font-medium'>
                  Hausnummer
                </label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={form.houseNumber}
                  onChange={(e) => update('houseNumber', e.target.value)}
                />
              </div>

              <div>
                <label className='mb-1 block text-xs font-medium'>PLZ</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={form.zipCode}
                  onChange={(e) => update('zipCode', e.target.value)}
                />
              </div>

              <div>
                <label className='mb-1 block text-xs font-medium'>Ort</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>

              <div>
                <label className='mb-1 block text-xs font-medium'>Land</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                />
              </div>

              <div>
                <label className='mb-1 block text-xs font-medium'>Region</label>
                <input
                  className='bg-background w-full rounded-md border px-3 py-2 text-sm'
                  value={form.region}
                  onChange={(e) => update('region', e.target.value)}
                />
              </div>
            </div>
          </div>

          {error ? <div className='text-sm text-red-500'>{error}</div> : null}
          {success ? (
            <div className='text-sm text-green-600'>{success}</div>
          ) : null}

          <div className='flex justify-end'>
            <button
              type='submit'
              disabled={saving}
              className='bg-foreground text-background rounded-md px-4 py-2 text-sm disabled:opacity-60'
            >
              {saving ? 'Speichern…' : 'Profil speichern'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
