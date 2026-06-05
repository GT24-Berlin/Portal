import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(
        // Lumen input: panel surface, hairline rim, lumen focus glow
        'flex h-10 w-full min-w-0 rounded-md px-3 py-2 text-base outline-none md:text-sm',
        'text-foreground bg-[var(--lumen-panel)]',
        'shadow-[var(--lumen-rim)]',
        'placeholder:text-muted-foreground/60',
        'transition-[box-shadow,background-color] duration-[420ms] [transition-timing-function:var(--lumen-ease)]',
        'hover:shadow-[var(--lumen-rim-strong)]',
        'focus-visible:bg-[var(--lumen-panel-raised)] focus-visible:shadow-[var(--lumen-rim-strong),var(--lumen-focus)]',
        'file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'selection:bg-[var(--lumen-glow)] selection:text-[var(--lumen-graphite)]',
        'aria-invalid:shadow-[var(--lumen-rim),0_0_0_1px_var(--destructive)] aria-invalid:focus-visible:shadow-[var(--lumen-rim-strong),0_0_0_1px_var(--destructive)]',
        className
      )}
      {...props}
    />
  );
}

export { Input };
