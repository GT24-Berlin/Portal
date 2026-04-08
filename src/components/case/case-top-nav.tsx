import Link from 'next/link';

export default function CaseTopNav(props: {
  token: string;
  active: 'status' | 'profile' | 'edit' | 'verify' | 'register' | 'documents';
  title?: string; // optional, z.B. "Dein Fallstatus" oder "Profil"
  subtitle?: string; // optional, z.B. "Fall CS-1234"
  showEdit?: boolean; // optional: Bearbeiten-Button zeigen
}) {
  const { token, active, title, subtitle, showEdit } = props;

  const baseBtn = 'rounded-lg border px-3 py-2 text-sm hover:bg-muted';
  const activeBtn =
    'rounded-lg bg-foreground px-3 py-2 text-sm text-background hover:opacity-90';

  return (
    <div className='flex items-start justify-between gap-4'>
      <div className='space-y-1'>
        <p className='text-muted-foreground text-sm'>
          Gutachtery24 · Case Tracker
        </p>
        {title ? <h1 className='text-3xl font-semibold'>{title}</h1> : null}
        {subtitle ? <p className='text-muted-foreground'>{subtitle}</p> : null}
      </div>

      <div className='flex items-center gap-2'>
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
  );
}
