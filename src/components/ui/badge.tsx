import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Lumen chip base: pill shape, JetBrains Mono, hairline rim
  'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] duration-[200ms] overflow-hidden font-mono tracking-[0.02em]',
  {
    variants: {
      variant: {
        default:
          // Lumen default chip: panel + rim
          'bg-[var(--lumen-panel)] text-muted-foreground shadow-[var(--lumen-rim)]',
        secondary:
          'bg-[var(--lumen-panel-raised)] text-muted-foreground shadow-[var(--lumen-rim)]',
        destructive:
          'bg-destructive/15 text-destructive border border-destructive/25',
        outline:
          // Outlined chip: transparent + hairline border
          'bg-transparent text-foreground border border-[var(--lumen-hairline)]'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot='badge'
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
