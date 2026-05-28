import { SignUp as ClerkSignUpForm } from '@clerk/nextjs';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';

const highlights = [
  {
    icon: FileText,
    title: 'Fallzugang',
    text: 'Der Einstieg in einen konkreten Schadenfall bleibt klar und geführt.'
  },
  {
    icon: Users,
    title: 'Rollenbasiert',
    text: 'Kunden, Partner und operative Teams erhalten passende Zugänge.'
  },
  {
    icon: Sparkles,
    title: 'Produktiver Start',
    text: 'Die Plattform wirkt ruhig, vertrauenswürdig und direkt nutzbar.'
  }
] as const;

export default function SignUpViewPage() {
  return (
    <div className='bg-background text-foreground min-h-screen'>
      <div className='grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]'>
        <aside className='border-border/60 bg-background/78 relative hidden overflow-hidden border-r lg:flex lg:flex-col'>
          <div className='from-primary/[0.05] to-foreground/[0.04] absolute inset-0 bg-gradient-to-br via-transparent' />
          <div className='relative flex h-full flex-col justify-between p-8 xl:p-10'>
            <div className='space-y-6'>
              <div className='border-border/60 bg-background/80 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)]'>
                <ShieldCheck className='h-4 w-4' />
                Neuer Zugang für Gutachtery24
              </div>

              <div className='space-y-3'>
                <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Gutachtery24
                </p>
                <h1 className='font-heading text-foreground max-w-lg text-4xl font-semibold tracking-tight xl:text-5xl'>
                  Ein klarer Einstieg in die digitale Schadenbearbeitung.
                </h1>
                <p className='text-muted-foreground max-w-xl text-sm leading-6 xl:text-[15px]'>
                  Registrierung und Zugang richten sich an die Rollen und
                  Arbeitsabläufe rund um Kundenfälle, Partnerkommunikation und
                  operative Bearbeitung.
                </p>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='grid gap-3'>
                {highlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className='border-border/60 bg-background/84 flex gap-3 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'
                    >
                      <div className='border-border/60 bg-background/90 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-[var(--shadow-soft)]'>
                        <Icon className='h-4.5 w-4.5' />
                      </div>
                      <div className='space-y-1'>
                        <div className='text-foreground text-sm font-medium'>
                          {item.title}
                        </div>
                        <div className='text-muted-foreground text-sm leading-6'>
                          {item.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <main className='flex items-center justify-center px-4 py-8 md:px-6 lg:px-8'>
          <div className='w-full max-w-lg space-y-6'>
            <div className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
              <div className='space-y-3'>
                <div className='border-border/60 bg-background/80 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)] lg:hidden'>
                  <ShieldCheck className='h-4 w-4' />
                  Gutachtery24
                </div>
                <div className='space-y-2'>
                  <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                    Zugang anfordern
                  </p>
                  <h2 className='font-heading text-foreground text-3xl font-semibold tracking-tight'>
                    Registrierung
                  </h2>
                  <p className='text-muted-foreground text-sm leading-6 md:text-[15px]'>
                    Lege einen Zugang für die produktive Nutzung von
                    Gutachtery24 an und erhalte Zugriff auf die passende
                    Arbeitsumgebung.
                  </p>
                </div>
              </div>

              <div className='border-border/60 bg-background/84 mt-6 overflow-hidden rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
                <ClerkSignUpForm
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      cardBox: 'shadow-none border-0 bg-transparent',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      socialButtonsBlockButton:
                        'rounded-full border-border/60 bg-background/85 shadow-[var(--shadow-soft)] hover:bg-background/95',
                      formButtonPrimary:
                        'rounded-full bg-foreground text-background shadow-[var(--shadow-soft)] hover:opacity-90',
                      formFieldInput:
                        'rounded-2xl border-border/60 bg-background/90 shadow-[var(--shadow-soft)]',
                      identityPreviewText:
                        'text-foreground text-sm font-medium',
                      footer: 'hidden'
                    }
                  }}
                />
              </div>

              <div className='mt-6 flex flex-wrap items-center justify-between gap-3'>
                <p className='text-muted-foreground text-sm leading-6'>
                  Schon registriert?{' '}
                  <Link
                    href='/auth/sign-in'
                    className='text-foreground underline underline-offset-4'
                  >
                    Zum Login
                  </Link>
                </p>

                <Link
                  href='/'
                  className='border-border/60 bg-background/80 hover:bg-background/95 inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-colors'
                >
                  Zur Produktseite
                  <ArrowRight className='h-4 w-4' />
                </Link>
              </div>

              <p className='text-muted-foreground mt-5 text-xs leading-5'>
                Der Zugang ist für die Nutzung der Plattform und ihrer
                fallbezogenen Arbeitsbereiche vorgesehen.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
