import React from 'react';
import * as Radix from '@radix-ui/react-scroll-area';
import { cn } from '../../lib/utils';

/** Themed scroll container with a thin dark thumb. */
const ScrollArea = React.forwardRef(function ScrollArea(
  { className, viewportClassName, children, ...props },
  ref
) {
  return (
    <Radix.Root
      ref={ref}
      type="scroll"
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <Radix.Viewport className={cn('h-full w-full', viewportClassName)}>
        {children}
      </Radix.Viewport>
      <Radix.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none select-none p-0.5 transition-colors"
      >
        <Radix.Thumb className="relative flex-1 rounded-full bg-white/15" />
      </Radix.Scrollbar>
      <Radix.Corner />
    </Radix.Root>
  );
});

export default ScrollArea;
