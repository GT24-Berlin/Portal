'use client';

import { useEffect } from 'react';

export default function CaseOtpCookieRefresh({ token }: { token: string }) {
  useEffect(() => {
    let alive = true;

    // silent refresh (Cookie wird per Set-Cookie vom Browser gespeichert)
    fetch(`/api/case/${token}/otp/refresh`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store'
    }).catch(() => {
      // MVP: silent
    });

    return () => {
      alive = false;
      void alive;
    };
  }, [token]);

  return null;
}
