'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useNotificationUnread(pollMs = 15000) {
  const { isLoaded, isSignedIn } = useAuth();
  const [count, setCount] = useState<number>(0);

  // verhindert Parallel-Requests
  const inFlightRef = useRef(false);

  // Abort alter Requests bei Re-Renders / Unmount
  const abortRef = useRef<AbortController | null>(null);

  // wenn 401 kommt: kurz Pause (damit Clerk Session refreshen kann)
  const pauseUntilRef = useRef<number>(0);

  const load = useCallback(async () => {
    // noch nicht ready / nicht eingeloggt
    if (!isLoaded || !isSignedIn) {
      setCount(0);
      return;
    }

    // Pause aktiv? -> nicht fetchen
    if (Date.now() < pauseUntilRef.current) return;

    // nur 1 Request gleichzeitig
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // vorherigen Request abbrechen
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/notifications/unread-count', {
        cache: 'no-store',
        credentials: 'include',
        signal: controller.signal
      });

      // 401: kurz warten, nicht spammen
      if (res.status === 401) {
        setCount(0);
        pauseUntilRef.current = Date.now() + 30000; // 30s Pause
        return;
      }

      if (!res.ok) return;

      const data = await res.json().catch(() => null);
      if (data?.ok) setCount(Number(data.count ?? 0));
    } catch (e: any) {
      // abort ist ok
      if (e?.name !== 'AbortError') {
        // MVP: silent
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // beim Unmount sauber abbrechen
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setCount(0);
      return;
    }

    // initial
    load();

    const tick = () => {
      if (document.visibilityState === 'visible') load();
    };

    // bei Tab-Fokus sofort updaten
    const onFocus = () => tick();
    const onVis = () => tick();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    const t = setInterval(tick, pollMs);

    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isLoaded, isSignedIn, pollMs, load]);

  return { count, refresh: load };
}
