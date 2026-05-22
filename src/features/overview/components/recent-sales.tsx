import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';

const salesData = [
  {
    name: 'Anna Becker',
    email: 'Fall GT0007 · Gutachter angefragt',
    avatar: 'https://api.slingacademy.com/public/sample-users/1.png',
    fallback: '01',
    amount: 'Offen'
  },
  {
    name: 'Max Lehmann',
    email: 'Fall GT0012 · Anwalt in Prüfung',
    avatar: 'https://api.slingacademy.com/public/sample-users/2.png',
    fallback: '02',
    amount: 'In Bearbeitung'
  },
  {
    name: 'Sabrina Wolf',
    email: 'Fall GT0009 · Termin bestätigt',
    avatar: 'https://api.slingacademy.com/public/sample-users/3.png',
    fallback: '03',
    amount: 'Bestätigt'
  },
  {
    name: 'Tim Krüger',
    email: 'Fall GT0015 · Rückfrage offen',
    avatar: 'https://api.slingacademy.com/public/sample-users/4.png',
    fallback: '04',
    amount: 'Rückfrage'
  },
  {
    name: 'Laura Schmidt',
    email: 'Fall GT0018 · abgeschlossen',
    avatar: 'https://api.slingacademy.com/public/sample-users/5.png',
    fallback: '05',
    amount: 'Abgeschlossen'
  }
];

export function RecentSales() {
  return (
    <Card className='border-border/60 bg-card/95 h-full overflow-hidden shadow-sm'>
      <CardHeader className='border-border/60 bg-muted/15 border-b'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Operative Lage
          </div>
          <CardTitle className='font-heading text-foreground text-base tracking-tight'>
            Aktuelle Fälle
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            Die wichtigsten Fälle aus dem laufenden Betrieb.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className='pt-4'>
        <div className='space-y-5'>
          {salesData.map((sale, index) => (
            <div
              key={index}
              className='border-border/60 bg-background/80 flex items-center gap-4 rounded-2xl border px-4 py-3 shadow-sm'
            >
              <Avatar className='border-border/60 h-9 w-9 border shadow-sm'>
                <AvatarImage src={sale.avatar} alt='Avatar' />
                <AvatarFallback>{sale.fallback}</AvatarFallback>
              </Avatar>
              <div className='min-w-0 flex-1 space-y-1'>
                <p className='text-sm leading-none font-medium'>{sale.name}</p>
                <p className='text-muted-foreground truncate text-sm'>
                  {sale.email}
                </p>
              </div>
              <div className='font-heading text-foreground text-sm font-semibold tabular-nums'>
                {sale.amount}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
