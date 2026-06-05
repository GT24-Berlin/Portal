'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot='tabs'
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      className={cn(
        // Lumen tabs container: panel background, hairline rim, 7px radius
        'inline-flex h-10 w-fit items-center justify-center rounded-md p-1',
        'bg-[var(--lumen-panel)] shadow-[var(--lumen-rim)]',
        'text-muted-foreground gap-0.5',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot='tabs-trigger'
      className={cn(
        // Lumen tab trigger: muted at rest, lumen-surface + horizon when active
        'lumen-horizon inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5',
        'rounded-[5px] border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap',
        'text-muted-foreground transition-[color,background,box-shadow] duration-[420ms] [transition-timing-function:var(--lumen-ease)]',
        'hover:text-foreground',
        // Active state: raised lumen surface + rim
        'data-[state=active]:text-foreground data-[state=active]:shadow-[var(--lumen-rim)] data-[state=active]:[background:var(--lumen-surface)]',
        'focus-visible:shadow-[var(--lumen-rim-strong),var(--lumen-focus)] focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot='tabs-content'
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
