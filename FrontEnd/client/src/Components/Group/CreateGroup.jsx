import React, { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa6';
import SelectedMembers from './SelectedMembers';
import ChatCard from '../ChatCard/ChatCard';
import { BsArrowRight } from 'react-icons/bs';
import NewGroup from './NewGroup';
import { useDispatch, useSelector } from 'react-redux';
import { searchUser } from '../../Redux/Auth/Action';
import Input from '../ui/Input';
import IconButton from '../ui/IconButton';
import ScrollArea from '../ui/ScrollArea';

const CreateGroup = ({ setIsGroup }) => {
  const [newGroup, setNewGroup] = useState(false);
  const [groupMember, setGroupMember] = useState(new Set());
  const [query, setQuery] = useState('');
  const dispatch = useDispatch();
  const token = localStorage.getItem('jwt');

  const handleRemoveMember = (item) => {
    setGroupMember((prev) => {
      const updatedGroup = new Set(prev);
      updatedGroup.delete(item);
      return updatedGroup;
    });
  };

  const { auth } = useSelector((store) => store);

  const handleSearch = (searchQuery) => {
    if (searchQuery) {
      dispatch(searchUser({ keyword: searchQuery, token }));
    }
  };

  const handleAddMember = (item) => {
    setGroupMember((prev) => {
      const updatedGroup = new Set(prev);
      updatedGroup.add(item);
      return updatedGroup;
    });
    setQuery(''); // Clear search input after adding a member
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {!newGroup ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-line px-5 py-4">
            <IconButton onClick={() => setIsGroup(false)} title="Back">
              <FaArrowLeft />
            </IconButton>
            <h2 className="font-display text-2xl text-ink">Add participants</h2>
          </div>

          {/* Selected chips + search */}
          <div className="space-y-3 px-5 py-4">
            {groupMember.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from(groupMember).map((item) => (
                  <SelectedMembers
                    key={item.id}
                    handleRemoveMember={() => handleRemoveMember(item)}
                    member={item}
                  />
                ))}
              </div>
            )}
            <Input
              type="text"
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                handleSearch(value);
              }}
              placeholder="Search user"
              value={query}
            />
          </div>

          {/* Results */}
          <ScrollArea className="flex-1" viewportClassName="px-3">
            {query &&
              auth.searchUser?.map((item) => (
                <div key={item.id} onClick={() => handleAddMember(item)}>
                  <ChatCard userImg={item.profile_picture} name={item.full_name} />
                </div>
              ))}
          </ScrollArea>
        </div>
      ) : (
        <NewGroup setIsGroup={setIsGroup} groupMember={Array.from(groupMember)} />
      )}

      {/* Next FAB */}
      {!newGroup && groupMember.size > 0 && (
        <div className="flex items-center justify-end border-t border-line px-5 py-4">
          <button
            onClick={() => setNewGroup(true)}
            className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-fg shadow-glow transition-transform hover:-translate-y-0.5"
            title="Next"
          >
            <BsArrowRight className="text-xl" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateGroup;
