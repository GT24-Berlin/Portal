import Link from 'next/link';

export default function CaseTopNav(props: {
  token: string;
  active:
    | 'status'
    | 'profile'
    | 'edit'
    | 'verify'
    | 'register'
    | 'documents'
    | 'gutachten'
    | 'appointments';
  title?: string; // optional, z.B. "Dein Fallstatus" oder "Profil"
  subtitle?: string; // optional, z.B. "Fallnummer GT0001"
  showEdit?: boolean; // optional: Bearbeiten-Button zeigen
}) {
  const { token, active, title, subtitle, showEdit } = props;

  const baseBtn =
    'rounded-full border border-border/60 bg-background/80 px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] shadow-sm transition-all hover:border-foreground/15 hover:bg-background/95 hover:shadow-[var(--shadow-soft)]';
  const activeBtn =
    'rounded-full bg-foreground px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-background shadow-[var(--shadow-soft)] hover:opacity-90';

  return (
    <div className='border-border/60 bg-background/78 overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow-glass)] backdrop-blur-xl md:p-7'>
      <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
        <div className='space-y-2'>
          <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase'>
            Gutachtery24 · Kundenportal
          </p>
          {title ? (
            <h1 className='font-heading text-[2.15rem] font-semibold tracking-tight md:text-[2.8rem]'>
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className='text-muted-foreground max-w-2xl text-[14px] leading-6 md:text-[15px]'>
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Link
            href={`/case/${token}`}
            className={active === 'status' ? activeBtn : baseBtn}
          >
            Fallstatus
          </Link>

          <Link
            href={`/case/${token}/documents`}
            className={active === 'documents' ? activeBtn : baseBtn}
          >
            Dokumente
          </Link>

          <Link
            href={`/case/${token}/gutachten`}
            className={active === 'gutachten' ? activeBtn : baseBtn}
          >
            Ihr Gutachten
          </Link>

          <Link
            href={`/case/${token}/appointments`}
            className={active === 'appointments' ? activeBtn : baseBtn}
          >
            Termin planen
          </Link>

          <Link
            href={`/case/${token}/profile`}
            className={active === 'profile' ? activeBtn : baseBtn}
          >
            Profil
          </Link>

          {active === 'profile' ? (
            <Link href={`/case/${token}/profile/edit`} className={baseBtn}>
              Bearbeiten
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
