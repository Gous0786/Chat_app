import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/** Round hit-area wrapper for react-icons in headers, the composer, etc. */
const IconButton = React.forwardRef(function IconButton(
  { className, children, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'grid place-items-center rounded-xl h-10 w-10 text-ink-muted',
        'transition-colors hover:text-ink hover:bg-glass',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});

export default IconButton;
