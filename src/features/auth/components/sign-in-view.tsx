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
    <div
      className='text-foreground min-h-screen'
      style={{ backgroundColor: 'var(--lumen-void)' }}
    >
      <div className='grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]'>
        {/* ── Left panel ── */}
        <aside
          className='relative hidden overflow-hidden border-r lg:flex lg:flex-col'
          style={{
            backgroundColor: 'var(--lumen-panel)',
            backgroundImage: 'var(--lumen-surface-panel)',
            borderColor: 'var(--lumen-hairline)'
          }}
        >
          <div className='relative flex h-full flex-col justify-between p-8 xl:p-10'>
            <div className='space-y-8'>
              {/* Badge */}
              <div
                className='inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium'
                style={{
                  backgroundColor: 'var(--lumen-panel-raised)',
                  boxShadow: 'var(--lumen-rim)',
                  color: 'var(--lumen-muted)'
                }}
              >
                <ShieldCheck className='h-3.5 w-3.5' />
                Geschützter Zugang zum Fallportal
              </div>

              <div className='space-y-4'>
                <p
                  className='text-[10px] font-medium tracking-[0.08em] uppercase'
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--lumen-muted)'
                  }}
                >
                  Gutachtery24
                </p>
                <h1
                  className='max-w-lg text-4xl leading-[1.1] font-bold tracking-[-0.02em] xl:text-5xl'
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--lumen-foreground)'
                  }}
                >
                  Der zentrale Zugang für digitale Kfz-Schadenfälle.
                </h1>
                <p className='text-muted-foreground max-w-xl text-sm leading-6 xl:text-[15px]'>
                  Melde dich an, um Fälle, Dokumente, Termine und die
                  rollenbasierte Zusammenarbeit in einer ruhigen, konsistenten
                  Oberfläche zu steuern.
                </p>
              </div>
            </div>

            {/* Highlights */}
            <div className='space-y-3'>
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className='flex gap-3 rounded-md p-4'
                    style={{
                      backgroundColor: 'var(--lumen-panel-raised)',
                      boxShadow: 'var(--lumen-rim)'
                    }}
                  >
                    <div
                      className='flex h-9 w-9 shrink-0 items-center justify-center rounded-md'
                      style={{
                        backgroundColor: 'var(--lumen-panel)',
                        boxShadow: 'var(--lumen-rim)'
                      }}
                    >
                      <Icon className='text-muted-foreground h-4 w-4' />
                    </div>
                    <div className='space-y-0.5'>
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

              <div
                className='flex items-start gap-3 rounded-md p-4'
                style={{
                  backgroundColor: 'var(--lumen-panel-raised)',
                  boxShadow: 'var(--lumen-rim)'
                }}
              >
                <div
                  className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md'
                  style={{
                    backgroundColor: 'var(--lumen-panel)',
                    boxShadow: 'var(--lumen-rim)'
                  }}
                >
                  <Users className='text-muted-foreground h-4 w-4' />
                </div>
                <div className='space-y-0.5'>
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

        {/* ── Right panel ── */}
        <main className='flex items-center justify-center px-4 py-8 md:px-6 lg:px-8'>
          <div className='w-full max-w-lg space-y-5'>
            {/* Sign-in card — Horizon Panel */}
            <div className='lumen-horizon-panel p-6 md:p-8'>
              <div className='space-y-3'>
                {/* Mobile badge */}
                <div
                  className='inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium lg:hidden'
                  style={{
                    backgroundColor: 'var(--lumen-panel-raised)',
                    boxShadow: 'var(--lumen-rim)',
                    color: 'var(--lumen-muted)'
                  }}
                >
                  <ShieldCheck className='h-3.5 w-3.5' />
                  Gutachtery24
                </div>

                <div className='space-y-2'>
                  <p
                    className='text-[10px] font-medium tracking-[0.08em] uppercase'
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: 'var(--lumen-muted)'
                    }}
                  >
                    Kunden- und Partnerzugang
                  </p>
                  <h2
                    className='text-3xl font-bold tracking-[-0.02em]'
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: 'var(--lumen-foreground)'
                    }}
                  >
                    Anmelden
                  </h2>
                  <p className='text-muted-foreground text-sm leading-6 md:text-[15px]'>
                    Bitte melde dich mit deinem bestehenden Zugang an, um auf
                    deine Fälle und den zugehörigen Arbeitsbereich zuzugreifen.
                  </p>
                </div>
              </div>

              {/* Clerk form */}
              <div
                className='mt-6 overflow-hidden rounded-md p-3'
                style={{
                  backgroundColor: 'var(--lumen-panel-raised)',
                  boxShadow: 'var(--lumen-rim)'
                }}
              >
                <ClerkSignInForm
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      cardBox: 'shadow-none border-0 bg-transparent',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      socialButtonsBlockButton:
                        'rounded-md border-0 bg-[var(--lumen-panel)] shadow-[var(--lumen-rim)] hover:shadow-[var(--lumen-rim-strong)] text-foreground',
                      formButtonPrimary:
                        'rounded-md bg-[var(--lumen-surface)] shadow-[var(--lumen-rim)] hover:shadow-[var(--lumen-rim-strong)] text-foreground',
                      formFieldInput:
                        'rounded-md border-0 bg-[var(--lumen-panel)] shadow-[var(--lumen-rim)] text-foreground focus:bg-[var(--lumen-panel-raised)] focus:shadow-[var(--lumen-rim-strong)]',
                      formFieldLabel:
                        'text-[10px] font-medium tracking-[0.08em] uppercase text-muted-foreground',
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
                  className='lumen-horizon text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-[color,box-shadow] duration-[420ms]'
                  style={{
                    backgroundColor: 'var(--lumen-panel)',
                    boxShadow: 'var(--lumen-rim)'
                  }}
                >
                  Zur Produktseite
                  <ArrowRight className='h-3.5 w-3.5' />
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
