import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-sans font-medium tracking-tight ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ' +
    'disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        // Gold fill, near-black text — the primary accent surface
        default: 'bg-accent text-accent-fg hover:shadow-glow',
        glass:
          'bg-glass text-ink border border-line-strong backdrop-blur-xl shadow-glass-sm hover:bg-glass-strong',
        ghost: 'text-ink-muted hover:text-ink hover:bg-glass',
        outline: 'border border-line text-ink hover:bg-glass hover:border-line-strong',
        destructive: 'bg-red-500/90 text-white hover:bg-red-500',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  if (asChild) {
    // Polymorphic: render caller's child (e.g. an <a>), no motion wrapper.
    return (
      <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  }
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { buttonVariants };
export default Button;
