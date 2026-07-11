import React from 'react';
import { cn } from '../../lib/utils';

/** Accent-colored rotating ring. Replaces MUI CircularProgress. */
export default function Spinner({ size = 24, className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block animate-spin rounded-full border-2 border-line', className)}
      style={{
        width: size,
        height: size,
        borderTopColor: 'var(--tw-ring-color, #E4C590)',
        borderRightColor: '#E4C590',
      }}
    />
  );
}
