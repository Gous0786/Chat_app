import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind conflict resolution.
 * The one shared helper every ui/ primitive imports.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
