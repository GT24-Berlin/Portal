import Link from 'next/link';

export default function DatabaseUnavailableState(props: {
  title: string;
  description: string;
  retryHref?: string;
  retryLabel?: string;
}) {
  return (
    <div className='bg-background text-foreground flex min-h-[100dvh] items-center justify-center p-6'>
      <div className='bg-card max-w-xl rounded-xl border p-6 shadow-sm'>
        <div className='space-y-3'>
          <div>
            <p className='text-muted-foreground text-xs tracking-wide uppercase'>
              Datenbank
            </p>
            <h1 className='text-xl font-semibold'>{props.title}</h1>
          </div>

          <p className='text-muted-foreground text-sm text-balance'>
            {props.description}
          </p>

          <div className='text-muted-foreground text-sm'>
            Bitte kurz neu laden. Wenn das Problem bleibt, ist die Datenbank-
            Verbindung gerade nicht erreichbar.
          </div>

          {props.retryHref ? (
            <div className='pt-2'>
              <Link
                href={props.retryHref}
                className='bg-foreground text-background inline-flex rounded-md px-3 py-2 text-sm'
              >
                {props.retryLabel ?? 'Erneut versuchen'}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
