import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  TimerReset,
  Upload,
  Users
} from 'lucide-react';

const capabilityCards = [
  {
    icon: FileText,
    title: 'Fallstatus & Verlauf',
    text: 'Kunden und Partner sehen den aktuellen Stand eines Schadenfalls transparent und nachvollziehbar.'
  },
  {
    icon: Upload,
    title: 'Dokumente & Nachweise',
    text: 'Uploads, Downloads und strukturierte Dokumentansichten bündeln alle Unterlagen an einem Ort.'
  },
  {
    icon: TimerReset,
    title: 'Termine & Verfügbarkeiten',
    text: 'Verfügbarkeiten, Anfragen und Bestätigungen laufen in einem sauberen Scheduling-Flow zusammen.'
  },
  {
    icon: MessageSquareText,
    title: 'Partnerkommunikation',
    text: 'Partnerprofile, Inbox und Fallzuordnungen unterstützen eine klare, rollenbasierte Zusammenarbeit.'
  }
] as const;

const processSteps = [
  {
    step: '01',
    title: 'Fall anlegen',
    text: 'Die digitale Akte wird mit den ersten Angaben und dem Kundenkontext vorbereitet.'
  },
  {
    step: '02',
    title: 'Unterlagen bündeln',
    text: 'Dokumente, Fotos und Nachweise werden zentral erfasst und dem Fall zugeordnet.'
  },
  {
    step: '03',
    title: 'Status steuern',
    text: 'Kundenstatus, Partnerstatus und operative Bearbeitung bleiben jederzeit nachvollziehbar.'
  },
  {
    step: '04',
    title: 'Termin & Gutachten',
    text: 'Termine, Gutachten und Abschluss werden in einer klaren Produktlogik zusammengeführt.'
  }
] as const;

const audienceCards = [
  {
    title: 'Für Kunden',
    text: 'Ein geschütztes Portal für Registrierung, Fallstatus, Dokumente und Termine.'
  },
  {
    title: 'Für Partner',
    text: 'Ein fokussierter Arbeitsbereich für Verfügbarkeiten, Anfragen und Fallzuordnung.'
  },
  {
    title: 'Für Ops',
    text: 'Ein operativer Überblick für Zuweisungen, Statuspflege und Fallbearbeitung.'
  }
] as const;

export default function Landing() {
  return (
    <div className='bg-background text-foreground min-h-screen'>
      <div className='relative isolate overflow-hidden'>
        <div className='bg-primary/8 absolute top-[-12rem] right-[-10rem] h-72 w-72 rounded-full blur-3xl' />
        <div className='bg-muted/30 absolute top-[18rem] left-[-8rem] h-72 w-72 rounded-full blur-3xl' />

        <div className='relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8'>
          <header className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border px-5 py-4 shadow-[var(--shadow-glass)] backdrop-blur-xl md:px-6'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                  Gutachtery24
                </div>
                <div className='text-foreground font-heading text-lg font-semibold tracking-tight'>
                  Digitale Schadenplattform für Kfz-Fälle
                </div>
              </div>

              <div className='flex flex-wrap gap-2'>
                <a
                  href='#funktionen'
                  className='border-border/60 bg-background/80 hover:bg-background/95 rounded-full border px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-[var(--shadow-soft)] transition-colors'
                >
                  Funktionen
                </a>
                <Link
                  href='/auth/sign-in'
                  className='bg-foreground text-background rounded-full px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90'
                >
                  Zum Portal
                </Link>
              </div>
            </div>
          </header>

          <main className='mt-6 space-y-6'>
            <section className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border shadow-[var(--shadow-glass)] backdrop-blur-xl'>
              <div className='grid gap-0 lg:grid-cols-[1.2fr_0.8fr]'>
                <div className='space-y-6 p-6 md:p-8 lg:p-10'>
                  <div className='space-y-4'>
                    <div className='border-border/60 bg-background/80 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)]'>
                      <ShieldCheck className='text-foreground h-4 w-4' />
                      Vertrauen, Transparenz und Geschwindigkeit
                    </div>

                    <div className='space-y-3'>
                      <h1 className='font-heading max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl'>
                        Digitale Fallprozesse für Kfz-Schäden — klar, ruhig und
                        nachvollziehbar.
                      </h1>
                      <p className='text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]'>
                        Gutachtery24 bündelt Fallstatus, Dokumente, Gutachten,
                        Termine und Partnerkommunikation in einer einheitlichen
                        Plattform. Kunden behalten den Überblick, Partner
                        arbeiten strukturiert, und der operative Ablauf bleibt
                        jederzeit transparent.
                      </p>
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-3'>
                    <Link
                      href='/auth/sign-in'
                      className='bg-foreground text-background inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90'
                    >
                      Zum Kunden- und Partnerportal
                      <ArrowRight className='h-4 w-4' />
                    </Link>
                    <a
                      href='#funktionen'
                      className='border-border/60 bg-background/80 hover:bg-background/95 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-colors'
                    >
                      Produktbereiche ansehen
                    </a>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-3'>
                    <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                        Fallstatus
                      </div>
                      <div className='text-foreground text-sm font-medium'>
                        Für Kunden jederzeit sichtbar.
                      </div>
                    </div>
                    <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                        Dokumente
                      </div>
                      <div className='text-foreground text-sm font-medium'>
                        Zentral gesammelt und strukturiert.
                      </div>
                    </div>
                    <div className='border-border/60 bg-background/82 space-y-1 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                        Termine
                      </div>
                      <div className='text-foreground text-sm font-medium'>
                        Sauber geplant und nachvollziehbar.
                      </div>
                    </div>
                  </div>
                </div>

                <div className='border-border/60 bg-muted/10 border-t p-6 lg:border-t-0 lg:border-l lg:p-8'>
                  <div className='border-border/60 bg-background/84 space-y-4 rounded-[28px] border p-5 shadow-[var(--shadow-soft)]'>
                    <div className='space-y-2'>
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                        Produktüberblick
                      </div>
                      <div className='font-heading text-foreground text-2xl font-semibold tracking-tight'>
                        Eine Plattform für alle Beteiligten
                      </div>
                      <p className='text-muted-foreground text-sm leading-6'>
                        Das System führt Kundenportal, Partnerbereich und
                        operative Steuerung in einer konsistenten Oberfläche
                        zusammen.
                      </p>
                    </div>

                    <div className='space-y-3'>
                      <div className='border-border/60 bg-background/90 flex items-start gap-3 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                        <LayoutDashboard className='mt-0.5 h-5 w-5 shrink-0' />
                        <div className='space-y-1'>
                          <div className='text-foreground text-sm font-medium'>
                            Einheitliche Oberfläche
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            Ruhige Panels, klare Hierarchie und nachvollziehbare
                            Statussignale.
                          </div>
                        </div>
                      </div>

                      <div className='border-border/60 bg-background/90 flex items-start gap-3 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                        <Users className='mt-0.5 h-5 w-5 shrink-0' />
                        <div className='space-y-1'>
                          <div className='text-foreground text-sm font-medium'>
                            Rollenbasierter Zugriff
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            Kunden, Partner und Ops arbeiten in klar getrennten
                            Bereichen.
                          </div>
                        </div>
                      </div>

                      <div className='border-border/60 bg-background/90 flex items-start gap-3 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'>
                        <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0' />
                        <div className='space-y-1'>
                          <div className='text-foreground text-sm font-medium'>
                            Transparente Bearbeitung
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            Jeder Schritt im Fall bleibt sichtbar und sauber
                            dokumentiert.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              id='funktionen'
              className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'
            >
              <div className='flex flex-wrap items-end justify-between gap-4'>
                <div className='space-y-2'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                    Kernbereiche
                  </div>
                  <h2 className='font-heading text-foreground text-2xl font-semibold tracking-tight md:text-3xl'>
                    Alles Wichtige rund um den Schadenfall
                  </h2>
                  <p className='text-muted-foreground max-w-3xl text-sm leading-6 md:text-[15px]'>
                    Die Landing Page fokussiert bewusst auf die Funktionen, die
                    für den Alltag in der digitalen Schadenabwicklung wirklich
                    relevant sind.
                  </p>
                </div>

                <div className='border-border/60 bg-background/82 rounded-full border px-3.5 py-2 text-xs font-medium shadow-[var(--shadow-soft)]'>
                  Produktfokus statt Template
                </div>
              </div>

              <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                {capabilityCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <article
                      key={card.title}
                      className='border-border/60 bg-background/84 space-y-4 rounded-[28px] border p-5 shadow-[var(--shadow-soft)]'
                    >
                      <div className='border-border/60 bg-background/90 inline-flex rounded-full border p-3 shadow-[var(--shadow-soft)]'>
                        <Icon className='h-5 w-5' />
                      </div>
                      <div className='space-y-2'>
                        <h3 className='font-heading text-foreground text-lg font-semibold tracking-tight'>
                          {card.title}
                        </h3>
                        <p className='text-muted-foreground text-sm leading-6'>
                          {card.text}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className='grid gap-6 lg:grid-cols-[0.92fr_1.08fr]'>
              <div className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
                <div className='space-y-2'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                    Prozess
                  </div>
                  <h2 className='font-heading text-foreground text-2xl font-semibold tracking-tight'>
                    Vom Eingang bis zum Abschluss
                  </h2>
                  <p className='text-muted-foreground text-sm leading-6'>
                    Die Plattform begleitet den Fall durch einen klaren,
                    nachvollziehbaren Ablauf ohne Marketing-Sprech und ohne
                    unnötige Komplexität.
                  </p>
                </div>

                <div className='mt-6 space-y-3'>
                  {processSteps.map((item) => (
                    <div
                      key={item.step}
                      className='border-border/60 bg-background/84 flex gap-4 rounded-[24px] border p-4 shadow-[var(--shadow-soft)]'
                    >
                      <div className='border-border/60 bg-background/90 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-semibold shadow-[var(--shadow-soft)]'>
                        {item.step}
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
                  ))}
                </div>
              </div>

              <div className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
                <div className='space-y-2'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                    Für wen gedacht
                  </div>
                  <h2 className='font-heading text-foreground text-2xl font-semibold tracking-tight'>
                    Kunden, Partner und operative Teams
                  </h2>
                  <p className='text-muted-foreground text-sm leading-6'>
                    Die gleiche Plattform spricht alle Beteiligten an, aber mit
                    jeweils klaren Rollen und Aufgaben.
                  </p>
                </div>

                <div className='mt-6 grid gap-4 md:grid-cols-3'>
                  {audienceCards.map((card) => (
                    <article
                      key={card.title}
                      className='border-border/60 bg-background/84 rounded-[28px] border p-5 shadow-[var(--shadow-soft)]'
                    >
                      <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                        {card.title}
                      </div>
                      <p className='text-foreground mt-2 text-sm leading-6'>
                        {card.text}
                      </p>
                    </article>
                  ))}
                </div>

                <div className='border-border/60 bg-background/84 mt-4 rounded-[28px] border p-5 shadow-[var(--shadow-soft)]'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                    Ergebnis
                  </div>
                  <div className='text-foreground mt-2 text-sm leading-6 font-medium'>
                    Weniger Rückfragen, klarere Zuständigkeiten und ein
                    ruhigerer operativer Ablauf über den gesamten Fall hinweg.
                  </div>
                </div>
              </div>
            </section>

            <section className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-8'>
              <div className='flex flex-wrap items-end justify-between gap-4'>
                <div className='space-y-2'>
                  <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
                    Vertrauen & Zugang
                  </div>
                  <h2 className='font-heading text-foreground text-2xl font-semibold tracking-tight'>
                    Für bestehende Fälle direkt ins Portal
                  </h2>
                  <p className='text-muted-foreground max-w-3xl text-sm leading-6 md:text-[15px]'>
                    Die öffentliche Seite leitet nicht in eine Demo, sondern in
                    den produktiven Zugang zum Kunden- und Partnerportal.
                  </p>
                </div>

                <Link
                  href='/auth/sign-in'
                  className='bg-foreground text-background inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90'
                >
                  Zum Login
                  <ArrowRight className='h-4 w-4' />
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
