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
    'rounded-full border border-border/60 bg-background/80 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-muted';
  const activeBtn =
    'rounded-full bg-foreground px-3 py-2 text-sm text-background shadow-sm hover:opacity-90';

  return (
    <div className='border-border/60 bg-card/95 overflow-hidden rounded-[28px] border p-5 shadow-sm md:p-6'>
      <div className='flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
        <div className='space-y-2'>
          <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Gutachtery24 · Kundenportal
          </p>
          {title ? (
            <h1 className='font-heading text-3xl font-semibold tracking-tight md:text-4xl'>
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className='text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]'>
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
