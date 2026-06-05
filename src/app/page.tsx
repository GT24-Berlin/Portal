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
    <div
      className='text-foreground min-h-screen'
      style={{ backgroundColor: 'var(--lumen-void)' }}
    >
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav
        className='sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 md:px-6 md:py-4'
        style={{
          borderColor: 'var(--lumen-hairline)',
          backgroundColor: 'var(--lumen-panel)'
        }}
      >
        <div className='space-y-0.5'>
          <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
            Gutachtery24
          </div>
          <div className='text-foreground font-display text-sm font-semibold tracking-tight'>
            Digitale Schadenplattform
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <a
            href='#funktionen'
            className='text-muted-foreground hover:text-foreground px-3.5 py-2 text-sm transition-colors duration-[420ms]'
          >
            Funktionen
          </a>
          <Link
            href='/auth/sign-in'
            className='lumen-horizon text-foreground/75 hover:text-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-[color,box-shadow,transform] duration-[420ms]'
            style={{
              background: 'var(--lumen-surface)',
              boxShadow: 'var(--lumen-rim)'
            }}
          >
            Zum Portal
            <ArrowRight className='h-3.5 w-3.5' />
          </Link>
        </div>
      </nav>

      <div className='mx-auto max-w-6xl space-y-16 px-6 py-16'>
        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className='grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center'>
          {/* Left */}
          <div className='space-y-8'>
            <div className='space-y-2'>
              <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
                Kfz-Schadenplattform
              </div>
              <h1 className='font-display text-foreground text-5xl leading-[1.1] font-bold tracking-[-0.02em] md:text-6xl'>
                Digitale Fallprozesse für Kfz-Schäden —<br />
                <span className='text-muted-foreground'>
                  klar, ruhig und nachvollziehbar.
                </span>
              </h1>
            </div>

            <p className='text-muted-foreground max-w-xl text-lg leading-relaxed'>
              Gutachtery24 bündelt Fallstatus, Dokumente, Gutachten, Termine und
              Partnerkommunikation in einer einheitlichen Plattform.
            </p>

            <div className='flex flex-wrap gap-3'>
              <Link
                href='/auth/sign-in'
                className='lumen-horizon text-foreground/75 hover:text-foreground inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-[color,box-shadow,transform] duration-[420ms] hover:-translate-y-[3px] hover:scale-[1.04]'
                style={{
                  background: 'var(--lumen-surface)',
                  boxShadow: 'var(--lumen-rim)'
                }}
              >
                Zum Kunden- und Partnerportal
                <ArrowRight className='h-4 w-4' />
              </Link>
              <a
                href='#funktionen'
                className='text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium transition-colors duration-[420ms]'
                style={{ borderColor: 'var(--lumen-hairline)' }}
              >
                Produktbereiche ansehen
              </a>
            </div>

            {/* Stat chips */}
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              {[
                { label: 'Fallstatus', value: 'Jederzeit sichtbar' },
                { label: 'Dokumente', value: 'Zentral & strukturiert' },
                { label: 'Termine', value: 'Sauber geplant' }
              ].map((stat) => (
                <div
                  key={stat.label}
                  className='lumen-card-horizon space-y-1 rounded-md p-3'
                  style={{
                    backgroundColor: 'var(--lumen-panel)',
                    boxShadow: 'var(--lumen-rim)'
                  }}
                >
                  <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
                    {stat.label}
                  </div>
                  <div className='text-foreground text-xs font-medium'>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Horizon Panel (signature element) */}
          <div className='lumen-horizon-panel space-y-6 p-8'>
            <div className='flex items-start justify-between gap-4'>
              <div className='space-y-1'>
                <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
                  Gutachtery24 — System
                </div>
                <h2 className='font-display text-foreground text-2xl font-semibold tracking-[-0.02em]'>
                  Plattform aktiv
                </h2>
                <p className='text-muted-foreground max-w-xs text-sm leading-6'>
                  Kundenportal, Partnerbereich und operative Steuerung laufen in
                  einer konsistenten Oberfläche.
                </p>
              </div>
              {/* Status dot */}
              <div
                className='mt-1 h-2.5 w-2.5 shrink-0 rounded-full'
                style={{
                  backgroundColor: 'var(--lumen-glow)',
                  boxShadow: '0 0 12px rgba(207, 216, 230, 0.7)'
                }}
              />
            </div>

            <div className='space-y-2'>
              {[
                { icon: LayoutDashboard, label: 'Einheitliche Oberfläche' },
                { icon: Users, label: 'Rollenbasierter Zugriff' },
                { icon: CheckCircle2, label: 'Transparente Bearbeitung' }
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className='flex items-center gap-3 rounded-md px-3 py-2.5'
                  style={{
                    backgroundColor: 'var(--lumen-panel-raised)',
                    boxShadow: 'var(--lumen-rim)'
                  }}
                >
                  <Icon className='text-muted-foreground h-4 w-4 shrink-0' />
                  <span className='text-foreground text-sm'>{label}</span>
                </div>
              ))}
            </div>

            <div className='text-muted-foreground flex items-center justify-between font-mono text-xs'>
              <span>3 ROLLEN</span>
              <span>·</span>
              <span>7px RADIUS</span>
              <span>·</span>
              <span>1.00s EASE</span>
              <span>·</span>
              <span>0 FARBAKZENTE</span>
            </div>
          </div>
        </section>

        {/* ── Capabilities ────────────────────────────────────────── */}
        <section id='funktionen' className='space-y-8'>
          <div className='flex flex-wrap items-end justify-between gap-4'>
            <div className='space-y-2'>
              <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
                Kernbereiche
              </div>
              <h2 className='font-display text-foreground text-3xl font-semibold tracking-[-0.02em]'>
                Alles Wichtige rund um den Schadenfall
              </h2>
              <p className='text-muted-foreground max-w-2xl text-base leading-relaxed'>
                Vier Kernprozesse. Ein ruhiges System.
              </p>
            </div>
            <div
              className='text-muted-foreground rounded-full px-3.5 py-1.5 font-mono text-xs'
              style={{
                backgroundColor: 'var(--lumen-panel)',
                boxShadow: 'var(--lumen-rim)'
              }}
            >
              Produktfokus statt Template
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {capabilityCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className='lumen-card-horizon space-y-4 rounded-lg p-6'
                  style={{
                    backgroundColor: 'var(--lumen-panel)',
                    backgroundImage: 'var(--lumen-surface-panel)',
                    boxShadow: 'var(--lumen-rim), var(--lumen-shadow-card)'
                  }}
                >
                  <div
                    className='inline-flex rounded-md p-2.5'
                    style={{
                      backgroundColor: 'var(--lumen-panel-raised)',
                      boxShadow: 'var(--lumen-rim)'
                    }}
                  >
                    <Icon className='text-muted-foreground h-4 w-4' />
                  </div>
                  <div className='space-y-2'>
                    <h3 className='font-display text-foreground text-base font-semibold tracking-tight'>
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

        {/* ── Process + Audience ──────────────────────────────────── */}
        <section className='grid gap-6 lg:grid-cols-2'>
          {/* Process */}
          <div
            className='lumen-card-horizon space-y-6 rounded-lg p-8'
            style={{
              backgroundColor: 'var(--lumen-panel)',
              backgroundImage: 'var(--lumen-surface-panel)',
              boxShadow: 'var(--lumen-rim), var(--lumen-shadow-card)'
            }}
          >
            <div className='space-y-2'>
              <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
                Prozess
              </div>
              <h2 className='font-display text-foreground text-2xl font-semibold tracking-[-0.02em]'>
                Vom Eingang bis zum Abschluss
              </h2>
              <p className='text-muted-foreground text-sm leading-6'>
                Ein klarer, nachvollziehbarer Ablauf ohne unnötige Komplexität.
              </p>
            </div>

            <div className='space-y-3'>
              {processSteps.map((item) => (
                <div
                  key={item.step}
                  className='flex gap-4 rounded-md p-4'
                  style={{
                    backgroundColor: 'var(--lumen-panel-raised)',
                    boxShadow: 'var(--lumen-rim)'
                  }}
                >
                  <div
                    className='text-foreground/75 flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-mono text-sm font-semibold'
                    style={{
                      background: 'var(--lumen-surface)',
                      boxShadow: 'var(--lumen-rim)'
                    }}
                  >
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

          {/* Audience */}
          <div
            className='lumen-card-horizon space-y-6 rounded-lg p-8'
            style={{
              backgroundColor: 'var(--lumen-panel)',
              backgroundImage: 'var(--lumen-surface-panel)',
              boxShadow: 'var(--lumen-rim), var(--lumen-shadow-card)'
            }}
          >
            <div className='space-y-2'>
              <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
                Für wen gedacht
              </div>
              <h2 className='font-display text-foreground text-2xl font-semibold tracking-[-0.02em]'>
                Kunden, Partner und operative Teams
              </h2>
              <p className='text-muted-foreground text-sm leading-6'>
                Dieselbe Plattform — mit klar getrennten Rollen und Aufgaben.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-3'>
              {audienceCards.map((card) => (
                <article
                  key={card.title}
                  className='lumen-card-horizon space-y-2 rounded-md p-4'
                  style={{
                    backgroundColor: 'var(--lumen-panel-raised)',
                    boxShadow: 'var(--lumen-rim)'
                  }}
                >
                  <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
                    {card.title}
                  </div>
                  <p className='text-foreground text-sm leading-6'>
                    {card.text}
                  </p>
                </article>
              ))}
            </div>

            <div
              className='lumen-card-horizon space-y-1 rounded-md p-4'
              style={{
                backgroundColor: 'var(--lumen-panel-raised)',
                boxShadow: 'var(--lumen-rim)'
              }}
            >
              <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
                Ergebnis
              </div>
              <div className='text-foreground text-sm leading-6 font-medium'>
                Weniger Rückfragen, klarere Zuständigkeiten und ein ruhigerer
                operativer Ablauf über den gesamten Fall hinweg.
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section className='lumen-horizon-panel space-y-6 p-10 text-center'>
          <div className='space-y-3'>
            <div className='text-muted-foreground font-display text-[10px] font-medium tracking-[0.08em] uppercase'>
              Vertrauen & Zugang
            </div>
            <h2 className='font-display text-foreground text-3xl font-semibold tracking-[-0.02em]'>
              Für bestehende Fälle direkt ins Portal
            </h2>
            <p className='text-muted-foreground mx-auto max-w-lg text-base leading-relaxed'>
              Die öffentliche Seite leitet nicht in eine Demo, sondern in den
              produktiven Zugang zum Kunden- und Partnerportal.
            </p>
          </div>
          <Link
            href='/auth/sign-in'
            className='lumen-horizon text-foreground/75 hover:text-foreground inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-[color,box-shadow,transform] duration-[420ms] hover:-translate-y-[3px] hover:scale-[1.04]'
            style={{
              background: 'var(--lumen-surface)',
              boxShadow: 'var(--lumen-rim)'
            }}
          >
            Zum Login
            <ArrowRight className='h-4 w-4' />
          </Link>
        </section>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer
          className='text-muted-foreground flex flex-wrap items-center justify-between gap-4 border-t py-6 font-mono text-xs'
          style={{ borderColor: 'var(--lumen-hairline)' }}
        >
          <span>Gutachtery24 — Design System v1.0</span>
          <div className='flex gap-6'>
            <span>RADIAL SURFACE</span>
            <span>·</span>
            <span>1PX INSET RIM</span>
            <span>·</span>
            <span>70% HORIZON</span>
            <span>·</span>
            <span>RADIUS 7 / 14</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
