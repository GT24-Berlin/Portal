import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "lumen-horizon inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-[-0.01em] transition-[color,box-shadow,transform,opacity] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          // Lumen primary: radial-gradient surface, hairline rim, slow hover lift
          '[background:var(--lumen-surface)] text-foreground/75 shadow-[var(--lumen-rim)] duration-[420ms] [transition-timing-function:var(--lumen-ease)] hover:text-foreground hover:shadow-[var(--lumen-rim-strong)] hover:scale-[1.04] hover:-translate-y-[3px] focus-visible:shadow-[var(--lumen-rim-strong),var(--lumen-focus)] focus-visible:text-foreground active:-translate-y-[1px] active:scale-[1.01] active:duration-[200ms]',
        destructive:
          'bg-destructive text-white shadow-[var(--shadow-soft)] hover:bg-destructive/90 hover:shadow-[var(--shadow-elevated)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          // Secondary: flat panel surface with hairline rim
          'bg-[var(--lumen-panel)] text-foreground/75 shadow-[var(--lumen-rim)] hover:text-foreground hover:shadow-[var(--lumen-rim-strong)] focus-visible:shadow-[var(--lumen-rim-strong),var(--lumen-focus)]',
        secondary:
          'bg-[var(--lumen-panel)] text-foreground/75 shadow-[var(--lumen-rim)] hover:text-foreground hover:shadow-[var(--lumen-rim-strong)]',
        ghost:
          // Ghost: transparent with hairline border
          'bg-transparent text-muted-foreground border border-[var(--lumen-hairline)] hover:text-foreground hover:border-[rgba(255,255,255,0.16)] focus-visible:shadow-[var(--lumen-focus)]',
        link: 'text-primary underline-offset-4 decoration-primary/30 hover:underline hover:decoration-primary/50'
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-11 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9 rounded-md'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
