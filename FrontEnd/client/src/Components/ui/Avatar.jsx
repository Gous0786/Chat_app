import React from 'react';
import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';

const sizeMap = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-24 w-24 text-2xl',
};

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar with a graceful initials fallback — replaces the raw <img> tags that
 * relied on hardcoded pixabay URLs and broke on missing images.
 */
const Avatar = React.forwardRef(function Avatar(
  { src, name, size = 'sm', className, ...props },
  ref
) {
  return (
    <RadixAvatar.Root
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        'border border-line-strong',
        sizeMap[size],
        className
      )}
      {...props}
    >
      {src ? (
        <RadixAvatar.Image
          src={src}
          alt={name || ''}
          className="h-full w-full object-cover"
        />
      ) : null}
      <RadixAvatar.Fallback
        delayMs={src ? 400 : 0}
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-canvas font-display text-ink"
      >
        {initials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
});

export default Avatar;
