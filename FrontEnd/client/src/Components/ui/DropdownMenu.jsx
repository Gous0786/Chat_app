import React from 'react';
import * as Radix from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';

export const DropdownMenu = Radix.Root;
export const DropdownMenuTrigger = Radix.Trigger;

export const DropdownMenuContent = React.forwardRef(function DropdownMenuContent(
  { className, sideOffset = 8, ...props },
  ref
) {
  return (
    <Radix.Portal>
      <Radix.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[190px] overflow-hidden rounded-xl p-1.5',
          'bg-surface-2/90 border border-line-strong shadow-glass backdrop-blur-xl',
          'data-[state=open]:animate-fade-in',
          className
        )}
        {...props}
      />
    </Radix.Portal>
  );
});

export const DropdownMenuItem = React.forwardRef(function DropdownMenuItem(
  { className, ...props },
  ref
) {
  return (
    <Radix.Item
      ref={ref}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2.5',
        'text-sm text-ink outline-none transition-colors',
        'focus:bg-glass data-[highlighted]:bg-glass',
        className
      )}
      {...props}
    />
  );
});
