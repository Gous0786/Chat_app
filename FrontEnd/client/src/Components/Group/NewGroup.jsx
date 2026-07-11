import React, { useState } from 'react';
import { BsArrowLeft } from 'react-icons/bs';
import { useDispatch, useSelector } from 'react-redux';
import { createGroupChat } from '../../Redux/Chat/Action';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Spinner from '../ui/Spinner';

const NewGroup = ({ groupMember, setIsGroup }) => {
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const token = localStorage.getItem('jwt');

  const dispatch = useDispatch();

  const uploadToCloudinary = (pics) => {
    setIsImageUploading(true);
    const data = new FormData();
    data.append('file', pics);
    data.append('upload_preset', 'profile_images');
    data.append('cloud_name', 'dvrgsndeq');

    fetch('https://api.cloudinary.com/v1_1/dvrgsndeq/image/upload', {
      method: 'POST',
      body: data,
    })
      .then((res) => res.json())
      .then((data) => {
        setGroupImage(data.url.toString());
        setIsImageUploading(false);
      });
  };

  const { auth } = useSelector((store) => store);

  const handleCreateGroup = () => {
    const currentUserId = auth.reqUser.id;
    let userIds = [...new Set(groupMember.map((user) => user.id))];
    if (!userIds.includes(currentUserId)) {
      userIds.push(currentUserId);
    }

    const group = {
      userIds,
      chat_name: groupName,
      chat_image: groupImage,
    };
    const data = { group, token };

    dispatch(createGroupChat(data));
    setIsGroup(false);
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-line px-5 py-4">
        <IconButton onClick={() => setIsGroup(false)} title="Back">
          <BsArrowLeft />
        </IconButton>
        <h2 className="font-display text-2xl text-ink">New Group</h2>
      </div>

      {/* Group image */}
      <div className="my-10 flex flex-col items-center">
        <label htmlFor="imgInput" className="group relative cursor-pointer">
          <Avatar size="lg" src={groupImage} name={groupName || 'Group'} />
          {isImageUploading ? (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
              <Spinner size={28} />
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100">
              Add photo
            </span>
          )}
        </label>
        <input
          type="file"
          id="imgInput"
          accept="image/*"
          className="hidden"
          onChange={(e) => uploadToCloudinary(e.target.files[0])}
        />
      </div>

      {/* Group name */}
      <div className="px-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
          Group subject
        </p>
        <Input
          placeholder="Name your group"
          value={groupName}
          type="text"
          onChange={(e) => setGroupName(e.target.value)}
        />
      </div>

      {groupName && (
        <div className="mt-auto border-t border-line px-5 py-4">
          <Button onClick={handleCreateGroup} size="lg" className="w-full">
            Create Group
          </Button>
        </div>
      )}
    </div>
  );
};

export default NewGroup;
