'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { CalendarConnectionRow } from '../types';

type ProviderMeta = {
  key: CalendarConnectionRow['provider'];
  label: string;
  icon: string;
  description: string;
};

const PROVIDERS: ProviderMeta[] = [
  {
    key: 'GOOGLE',
    label: 'Google Kalender',
    icon: '🗓',
    description:
      'Bestätigte Termine werden automatisch in deinen Google Kalender eingetragen.'
  },
  {
    key: 'MICROSOFT',
    label: 'Outlook / Microsoft 365',
    icon: '📆',
    description:
      'Sync mit Outlook.com oder Microsoft 365 über Microsoft Graph API.'
  },
  {
    key: 'APPLE',
    label: 'Apple iCloud Kalender',
    icon: '🍎',
    description:
      'Verbinde deinen iCloud-Kalender über CalDAV mit einem App-spezifischen Passwort.'
  }
];

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Noch nicht synchronisiert';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function CalendarConnectionsPanel() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<CalendarConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<
    CalendarConnectionRow['provider'] | null
  >(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<
    CalendarConnectionRow['provider'] | null
  >(null);

  // Apple form state
  const [appleId, setAppleId] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [appleError, setAppleError] = useState<string | null>(null);
  const [appleSaving, setAppleSaving] = useState(false);

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/connections');
      const data = (await res.json()) as {
        ok: boolean;
        connections?: CalendarConnectionRow[];
      };
      if (data.ok && data.connections) {
        setConnections(data.connections);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected === 'google') {
      setBanner({ kind: 'ok', text: 'Google Kalender erfolgreich verbunden.' });
    } else if (connected === 'microsoft') {
      setBanner({
        kind: 'ok',
        text: 'Microsoft Outlook erfolgreich verbunden.'
      });
    } else if (error) {
      const map: Record<string, string> = {
        google_denied: 'Google-Verbindung wurde abgebrochen.',
        microsoft_denied: 'Microsoft-Verbindung wurde abgebrochen.',
        state_mismatch: 'Sicherheitsfehler: State stimmt nicht überein.',
        google_failed: 'Google-Verbindung fehlgeschlagen.',
        microsoft_failed: 'Microsoft-Verbindung fehlgeschlagen.',
        unauthorized: 'Nicht autorisiert.',
        no_profile: 'Kein Partnerprofil gefunden.'
      };
      setBanner({ kind: 'error', text: map[error] ?? `Fehler: ${error}` });
    }
  }, [searchParams]);

  function getConnection(
    provider: CalendarConnectionRow['provider']
  ): CalendarConnectionRow | undefined {
    return connections.find((c) => c.provider === provider);
  }

  async function handleOAuthConnect(provider: 'GOOGLE' | 'MICROSOFT') {
    setConnectingProvider(provider);
    try {
      const endpoint =
        provider === 'GOOGLE'
          ? '/api/calendar/google/auth-url'
          : '/api/calendar/microsoft/auth-url';
      const res = await fetch(endpoint);
      const data = (await res.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
      };
      if (!data.ok || !data.url) {
        throw new Error(data.error ?? 'Keine Auth-URL erhalten');
      }
      window.location.href = data.url;
    } catch (e) {
      setBanner({
        kind: 'error',
        text: `Verbindung fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`
      });
      setConnectingProvider(null);
    }
  }

  async function handleDisconnect(provider: CalendarConnectionRow['provider']) {
    setDisconnectingProvider(provider);
    try {
      const endpointMap: Record<CalendarConnectionRow['provider'], string> = {
        GOOGLE: '/api/calendar/google/disconnect',
        MICROSOFT: '/api/calendar/microsoft/disconnect',
        APPLE: '/api/calendar/apple/disconnect'
      };
      const res = await fetch(endpointMap[provider], { method: 'POST' });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Trennen fehlgeschlagen');
      await loadConnections();
      setBanner({ kind: 'ok', text: `${provider} Kalender getrennt.` });
    } catch (e) {
      setBanner({
        kind: 'error',
        text: `Fehler: ${e instanceof Error ? e.message : String(e)}`
      });
    } finally {
      setDisconnectingProvider(null);
    }
  }

  async function handleAppleConnect(e: React.FormEvent) {
    e.preventDefault();
    setAppleError(null);
    if (!appleId.trim() || !appPassword.trim()) {
      setAppleError('Apple-ID und App-Passwort sind erforderlich.');
      return;
    }
    setAppleSaving(true);
    try {
      const res = await fetch('/api/calendar/apple/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appleId: appleId.trim(),
          appPassword: appPassword.trim()
        })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Verbindung fehlgeschlagen');
      setAppleId('');
      setAppPassword('');
      await loadConnections();
      setBanner({
        kind: 'ok',
        text: 'Apple iCloud Kalender erfolgreich verbunden.'
      });
    } catch (err) {
      setAppleError(err instanceof Error ? err.message : String(err));
    } finally {
      setAppleSaving(false);
    }
  }

  return (
    <div className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border shadow-[var(--shadow-glass)] backdrop-blur-xl'>
      <div className='border-border/60 bg-muted/15 border-b px-6 py-5 md:px-8'>
        <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
          Externe Kalender
        </p>
        <h2 className='font-heading text-foreground mt-1 text-2xl font-semibold tracking-tight'>
          Kalender-Synchronisation
        </h2>
        <p className='text-muted-foreground mt-1 text-sm leading-6'>
          Verbinde deinen externen Kalender. Bestätigte Termine werden
          automatisch eingetragen, abgelehnte wieder entfernt.
        </p>
      </div>

      <div className='p-6 md:p-8'>
        {banner && (
          <div
            className={`mb-6 rounded-[24px] border px-4 py-3 text-sm shadow-sm ${
              banner.kind === 'ok'
                ? 'border-emerald-300/70 bg-emerald-50/80 text-emerald-900'
                : 'border-red-300/70 bg-red-50/80 text-red-900'
            }`}
          >
            <div className='flex items-center justify-between gap-2'>
              <span>{banner.text}</span>
              <button
                type='button'
                onClick={() => setBanner(null)}
                className='text-current opacity-50 hover:opacity-100'
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className='text-muted-foreground py-8 text-center text-sm'>
            Lade Verbindungen…
          </div>
        ) : (
          <div className='space-y-4'>
            {PROVIDERS.map((meta) => {
              const conn = getConnection(meta.key);
              const isConnected = conn != null;

              return (
                <div
                  key={meta.key}
                  className='border-border/60 bg-background/82 overflow-hidden rounded-[28px] border shadow-[var(--shadow-soft)]'
                >
                  <div className='flex flex-wrap items-start justify-between gap-4 p-5'>
                    <div className='flex items-center gap-3'>
                      <div className='border-border/60 bg-background/90 flex h-10 w-10 items-center justify-center rounded-full border text-xl shadow-sm'>
                        {meta.icon}
                      </div>
                      <div>
                        <div className='text-foreground text-sm font-semibold'>
                          {meta.label}
                        </div>
                        {isConnected ? (
                          <div className='text-muted-foreground text-xs'>
                            {conn.accountEmail
                              ? `Verbunden als ${conn.accountEmail}`
                              : 'Verbunden'}
                            {' · '}
                            Letzter Sync: {formatSyncTime(conn.lastSyncedAt)}
                          </div>
                        ) : (
                          <div className='text-muted-foreground text-xs'>
                            {meta.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      {isConnected ? (
                        <>
                          <div className='rounded-full border border-emerald-300/70 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-800'>
                            Verbunden
                          </div>
                          <button
                            type='button'
                            disabled={disconnectingProvider === meta.key}
                            onClick={() => handleDisconnect(meta.key)}
                            className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2 text-[13px] font-medium shadow-[var(--shadow-soft)] transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                          >
                            {disconnectingProvider === meta.key
                              ? 'Trennen…'
                              : 'Trennen'}
                          </button>
                        </>
                      ) : meta.key !== 'APPLE' ? (
                        <button
                          type='button'
                          disabled={connectingProvider === meta.key}
                          onClick={() =>
                            handleOAuthConnect(
                              meta.key as 'GOOGLE' | 'MICROSOFT'
                            )
                          }
                          className='bg-foreground text-background rounded-full px-4 py-2 text-[13px] font-medium shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {connectingProvider === meta.key
                            ? 'Weiterleitung…'
                            : 'Verbinden'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Apple connect form — only shown when not yet connected */}
                  {meta.key === 'APPLE' && !isConnected && (
                    <div className='border-border/60 border-t px-5 pb-5'>
                      <form
                        onSubmit={(e) => void handleAppleConnect(e)}
                        className='mt-4 space-y-3'
                      >
                        <div className='text-muted-foreground mb-3 rounded-[20px] border border-amber-200/60 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-5'>
                          <strong>Hinweis:</strong> Nutze ein App-spezifisches
                          Passwort, kein Account-Passwort. Erstelle es auf{' '}
                          <span className='font-mono'>appleid.apple.com</span> →
                          App-spezifische Passwörter.
                        </div>

                        <div className='grid gap-3 sm:grid-cols-2'>
                          <div className='space-y-1.5'>
                            <label className='text-foreground text-xs font-medium'>
                              Apple-ID (E-Mail)
                            </label>
                            <input
                              type='email'
                              value={appleId}
                              onChange={(e) => setAppleId(e.target.value)}
                              placeholder='deine@apple.com'
                              autoComplete='off'
                              className='bg-background/85 border-border/60 focus-visible:ring-primary/20 w-full rounded-[20px] border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                            />
                          </div>
                          <div className='space-y-1.5'>
                            <label className='text-foreground text-xs font-medium'>
                              App-Passwort
                            </label>
                            <input
                              type='password'
                              value={appPassword}
                              onChange={(e) => setAppPassword(e.target.value)}
                              placeholder='xxxx-xxxx-xxxx-xxxx'
                              autoComplete='new-password'
                              className='bg-background/85 border-border/60 focus-visible:ring-primary/20 w-full rounded-[20px] border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                            />
                          </div>
                        </div>

                        {appleError && (
                          <div className='rounded-[20px] border border-red-300/70 bg-red-50/80 px-3 py-2 text-[12px] text-red-900'>
                            {appleError}
                          </div>
                        )}

                        <button
                          type='submit'
                          disabled={appleSaving}
                          className='bg-foreground text-background inline-flex items-center rounded-full px-4 py-2 text-[13px] font-medium shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {appleSaving
                            ? 'Verbinde…'
                            : 'Apple Kalender verbinden'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className='border-border/60 bg-background/82 mt-6 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Sync-Verhalten
          </div>
          <div className='text-foreground mt-1.5 text-sm leading-6'>
            Termine werden nur in eine Richtung synchronisiert (Gutachtery24 →
            Kalender). Externe Termine werden nicht importiert.
          </div>
        </div>
      </div>
    </div>
  );
}
