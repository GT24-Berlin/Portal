import { SignIn as ClerkSignInForm } from '@clerk/nextjs';
import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  FileText,
  MessageSquareText,
  ShieldCheck,
  Users
} from 'lucide-react';

const highlights = [
  {
    icon: FileText,
    title: 'Fallstatus & Dokumente',
    text: 'Zugriff auf den aktuellen Stand und alle relevanten Unterlagen.'
  },
  {
    icon: Clock3,
    title: 'Termine & Rückfragen',
    text: 'Planung und Kommunikation bleiben sauber an den Fall gekoppelt.'
  },
  {
    icon: MessageSquareText,
    title: 'Partner- und Kundenfluss',
    text: 'Rollenbasierter Zugang für Kunden, Partner und operative Teams.'
  }
] as const;

export default function SignInViewPage() {
  return (
    <div className='bg-background text-foreground min-h-screen'>
      <div className='grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]'>
        <aside className='border-border/60 bg-background/78 relative hidden overflow-hidden border-r lg:flex lg:flex-col'>
          <div className='from-foreground/[0.04] to-primary/[0.05] absolute inset-0 bg-gradient-to-br via-transparent' />
          <div className='relative flex h-full flex-col justify-between p-8 xl:p-10'>
            <div className='space-y-6'>
              <div className='border-border/60 bg-background/80 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)]'>
                <ShieldCheck className='h-4 w-4' />
                Geschützter Zugang zum Fallportal
              </div>

              <div className='space-y-3'>
                <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Gutachtery24
                </p>
                <h1 className='font-heading text-foreground max-w-lg text-4xl font-semibold tracking-tight xl:text-5xl'>
                  Der zentrale Zugang für digitale Kfz-Schadenfälle.
                </h1>
                <p className='text-muted-foreground max-w-xl text-sm leading-6 xl:text-[15px]'>
                  Melde dich an, um Fälle, Dokumente, Termine und die
                  rollenbasierte Zusammenarbeit in einer ruhigen, konsistenten
                  Oberfläche zu steuern.
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

              <div className='border-border/60 bg-background/84 flex items-start gap-3 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                <Users className='mt-0.5 h-5 w-5 shrink-0' />
                <div className='space-y-1'>
                  <div className='text-foreground text-sm font-medium'>
                    Klar getrennte Rollen
                  </div>
                  <div className='text-muted-foreground text-sm leading-6'>
                    Kunden, Gutachter und Anwälte arbeiten in klaren,
                    produktiven Zugängen.
                  </div>
                </div>
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
                    Kunden- und Partnerzugang
                  </p>
                  <h2 className='font-heading text-foreground text-3xl font-semibold tracking-tight'>
                    Anmelden
                  </h2>
                  <p className='text-muted-foreground text-sm leading-6 md:text-[15px]'>
                    Bitte melde dich mit deinem bestehenden Zugang an, um auf
                    deine Fälle und den zugehörigen Arbeitsbereich zuzugreifen.
                  </p>
                </div>
              </div>

              <div className='border-border/60 bg-background/84 mt-6 overflow-hidden rounded-[28px] border p-4 shadow-[var(--shadow-soft)]'>
                <ClerkSignInForm
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
                  Noch kein Zugang?{' '}
                  <Link
                    href='/auth/sign-up'
                    className='text-foreground underline underline-offset-4'
                  >
                    Registrierung anfragen
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
                Mit dem Fortfahren akzeptierst du die geltenden Nutzungs- und
                Datenschutzbestimmungen von Gutachtery24.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
