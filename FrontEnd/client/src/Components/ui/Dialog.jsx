import React from 'react';
import * as Radix from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export const Dialog = Radix.Root;
export const DialogTrigger = Radix.Trigger;
export const DialogClose = Radix.Close;

const MotionContent = motion(Radix.Content);

export const DialogContent = React.forwardRef(function DialogContent(
  { className, children, open, ...props },
  ref
) {
  return (
    <AnimatePresence>
      <Radix.Portal forceMount>
        <Radix.Overlay asChild forceMount>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
        </Radix.Overlay>
        <MotionContent
          ref={ref}
          forceMount
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-2xl bg-surface border border-line-strong shadow-glass p-6',
            className
          )}
          {...props}
        >
          {children}
        </MotionContent>
      </Radix.Portal>
    </AnimatePresence>
  );
});

export const DialogTitle = React.forwardRef(function DialogTitle({ className, ...props }, ref) {
  return (
    <Radix.Title
      ref={ref}
      className={cn('font-display text-2xl text-ink', className)}
      {...props}
    />
  );
});
