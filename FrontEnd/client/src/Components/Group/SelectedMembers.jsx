import React from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import Avatar from '../ui/Avatar';

const SelectedMembers = ({ handleRemoveMember, member }) => {
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-glass py-1 pl-1 pr-2 backdrop-blur-md">
      <Avatar size="xs" src={member.profile_picture} name={member.full_name} />
      <span className="font-sans text-sm text-ink">{member.full_name}</span>
      <button
        onClick={handleRemoveMember}
        className="grid h-5 w-5 place-items-center rounded-full text-ink-muted transition-colors hover:bg-glass-strong hover:text-ink"
        title="Remove"
      >
        <AiOutlineClose className="text-xs" />
      </button>
    </div>
  );
};

export default SelectedMembers;
