import React from 'react';
import { cn } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import Timestamp from '../ui/Timestamp';

const ChatCard = ({ userImg, name, lastMessage, time, selected }) => {
  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
        selected ? 'bg-glass-strong' : 'hover:bg-glass'
      )}
    >
      <Avatar src={userImg} name={name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-sans text-sm font-medium text-ink">{name}</p>
          {time && <Timestamp value={time} className="shrink-0 text-ink-muted" />}
        </div>
        {lastMessage && (
          <p className="mt-0.5 truncate font-sans text-xs text-ink-muted">{lastMessage}</p>
        )}
      </div>
    </div>
  );
};

export default ChatCard;
