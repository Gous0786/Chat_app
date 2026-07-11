import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import Timestamp from '../ui/Timestamp';

/**
 * A single chat bubble.
 *  - Own message (isReqUserMessage): solid muted-gold fill, near-black text, right.
 *  - Received message: neutral glass, off-white text, left.
 * This is the primary surface carrying the gold "this is you" identity.
 */
const MessageCard = ({ isReqUserMessage, content, timestamp }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className={cn(
        'w-fit max-w-[70%] px-4 py-2.5 font-sans text-sm leading-relaxed',
        isReqUserMessage
          ? 'self-end bg-accent text-accent-fg rounded-2xl rounded-br-md shadow-glow'
          : 'self-start bg-glass text-ink border border-line rounded-2xl rounded-bl-md backdrop-blur-md'
      )}
    >
      <p className="whitespace-pre-wrap break-words">{content}</p>
      {timestamp && (
        <Timestamp
          value={timestamp}
          className={cn(
            'mt-1 block text-right',
            isReqUserMessage ? 'text-accent-fg/55' : 'text-ink-muted'
          )}
        />
      )}
    </motion.div>
  );
};

export default MessageCard;
