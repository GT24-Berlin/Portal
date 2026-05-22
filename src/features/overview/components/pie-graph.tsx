'use client';

import * as React from 'react';
import { IconTrendingUp } from '@tabler/icons-react';
import { Label, Pie, PieChart } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

const chartData = [
  { browser: 'open', visitors: 275, fill: 'var(--primary)' },
  { browser: 'pending', visitors: 200, fill: 'var(--foreground)' },
  { browser: 'confirmed', visitors: 287, fill: 'var(--muted-foreground)' },
  { browser: 'review', visitors: 173, fill: 'var(--border)' },
  { browser: 'other', visitors: 190, fill: 'var(--border)' }
];

const chartConfig = {
  visitors: {
    label: 'Fälle'
  },
  open: {
    label: 'Offen',
    color: 'var(--primary)'
  },
  pending: {
    label: 'In Prüfung',
    color: 'var(--foreground)'
  },
  confirmed: {
    label: 'Bestätigt',
    color: 'var(--muted-foreground)'
  },
  review: {
    label: 'Rückfrage',
    color: 'var(--border)'
  },
  other: {
    label: 'Sonstiges',
    color: 'var(--border)'
  }
} satisfies ChartConfig;

export function PieGraph() {
  const totalVisitors = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
  }, []);

  return (
    <Card className='border-border/60 bg-card/95 @container/card overflow-hidden shadow-sm'>
      <CardHeader className='border-border/60 bg-muted/15 border-b'>
        <div className='space-y-1'>
          <div className='text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase'>
            Statusverteilung
          </div>
          <CardTitle className='font-heading text-foreground text-base tracking-tight'>
            Fallverteilung - Donut
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            <span className='hidden @[540px]/card:block'>
              Verteilung der Fälle im laufenden Bestand
            </span>
            <span className='@[540px]/card:hidden'>Fallverteilung</span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <ChartContainer
          config={chartConfig}
          className='mx-auto aspect-square h-[250px]'
        >
          <PieChart>
            <defs>
              {['open', 'pending', 'confirmed', 'review', 'other'].map(
                (browser, index) => (
                  <linearGradient
                    key={browser}
                    id={`fill${browser}`}
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop
                      offset='0%'
                      stopColor='var(--primary)'
                      stopOpacity={1 - index * 0.15}
                    />
                    <stop
                      offset='100%'
                      stopColor='var(--primary)'
                      stopOpacity={0.8 - index * 0.15}
                    />
                  </linearGradient>
                )
              )}
            </defs>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData.map((item) => ({
                ...item,
                fill: `url(#fill${item.browser})`
              }))}
              dataKey='visitors'
              nameKey='browser'
              innerRadius={60}
              strokeWidth={2}
              stroke='var(--background)'
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor='middle'
                        dominantBaseline='middle'
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className='fill-foreground text-3xl font-bold'
                        >
                          {totalVisitors.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className='fill-muted-foreground text-sm'
                        >
                          Gesamtfälle
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className='border-border/60 bg-muted/10 flex-col gap-2 border-t text-sm'>
        <div className='flex items-center gap-2 leading-none font-medium'>
          Offen führt aktuell mit{' '}
          {((chartData[0].visitors / totalVisitors) * 100).toFixed(1)}%{' '}
          <IconTrendingUp className='h-4 w-4' />
        </div>
        <div className='text-muted-foreground leading-none'>
          Übersicht der letzten 6 Monate
        </div>
      </CardFooter>
    </Card>
  );
}
