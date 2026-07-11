import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5',
        'text-ink placeholder:text-ink-muted font-sans text-sm',
        'transition-colors outline-none',
        'focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/40',
        className
      )}
      {...props}
    />
  );
});

export default Input;
