import React from 'react';
import { cn } from '../../lib/utils';

/** Formats an ISO/LocalDateTime string to a short HH:MM. Mono font, muted. */
function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Timestamp({ value, className }) {
  const text = formatTime(value);
  if (!text) return null;
  return <span className={cn('font-mono text-[10px] tracking-wide', className)}>{text}</span>;
}
