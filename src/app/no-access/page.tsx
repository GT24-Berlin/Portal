'use client';

import { SignOutButton } from '@clerk/nextjs';

export default function NoAccessPage() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center'>
      <div className='flex max-w-sm flex-col gap-4'>
        <h1 className='text-xl font-semibold tracking-tight'>
          Kein Dashboard-Zugang
        </h1>
        <p className='text-muted-foreground text-sm'>
          Dieses Konto ist derzeit nicht für den Zugang zum Dashboard
          freigeschaltet. Bitte wende dich an den Administrator.
        </p>
        <SignOutButton>
          <button className='border-input bg-background hover:bg-accent hover:text-accent-foreground mt-2 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm'>
            Abmelden
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
