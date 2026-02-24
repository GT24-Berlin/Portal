import Link from 'next/link';

export default function Landing() {
  return (
    <div className='bg-background text-foreground min-h-screen'>
      <div className='mx-auto max-w-3xl space-y-6 px-4 py-16'>
        <h1 className='text-3xl font-semibold'>Gutachtery24</h1>
        <p className='text-muted-foreground'>MVP Navigation</p>

        <div className='flex flex-wrap gap-3'>
          <Link className='rounded-lg border px-4 py-2 text-sm' href='/sign-in'>
            Partner Login
          </Link>
          <Link
            className='rounded-lg border px-4 py-2 text-sm'
            href='/case/demo'
          >
            Kunden Case Tracker (Demo)
          </Link>
          <Link
            className='rounded-lg border px-4 py-2 text-sm'
            href='/dashboard/overview'
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
