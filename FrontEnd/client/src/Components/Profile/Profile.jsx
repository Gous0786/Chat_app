import React, { useState } from 'react';
import { BsArrowLeft, BsCheck2, BsPencil } from 'react-icons/bs';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../../Redux/Auth/Action';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import IconButton from '../ui/IconButton';

const Profile = ({ handleCloseOpenProfile }) => {
  const [flag, setFlag] = useState(false);
  const [username, setUsername] = useState(null);
  const { auth } = useSelector((store) => store);
  const dispatch = useDispatch();
  const [tempPicture, setTempPicture] = useState(null);

  const handleFlag = () => {
    setFlag(true);
  };

  const handleCheckClick = () => {
    const data = {
      id: auth.reqUser?.id,
      token: localStorage.getItem('jwt'),
      data: { full_name: username },
    };
    dispatch(updateUser(data));
    setFlag(false);
  };

  const handleChange = (e) => {
    setUsername(e.target.value);
  };

  const handleUpdateName = (e) => {
    if (e.key === 'Enter') {
      const data = {
        id: auth.reqUser?.id,
        token: localStorage.getItem('jwt'),
        data: { full_name: username },
      };
      dispatch(updateUser(data));
      setFlag(false);
    }
  };

  const uploadToCloudinary = (pics) => {
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
        setTempPicture(data.url.toString());

        const dataa = {
          id: auth.reqUser.id,
          token: localStorage.getItem('jwt'),
          data: { profile_picture: data.url.toString() },
        };
        dispatch(updateUser(dataa));
      });
  };

  return (
    <div className="flex h-full w-full flex-col p-5">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-line pb-4">
        <IconButton onClick={handleCloseOpenProfile} title="Back">
          <BsArrowLeft className="text-xl" />
        </IconButton>
        <h2 className="font-display text-2xl text-ink">Profile</h2>
      </div>

      {/* Avatar with hover overlay */}
      <div className="mt-8 flex flex-col items-center">
        <label htmlFor="imgInput" className="group relative cursor-pointer">
          <Avatar
            size="lg"
            src={auth.reqUser?.profile_picture || tempPicture}
            name={auth.reqUser?.full_name}
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100">
            Change
          </span>
        </label>
        <input
          onChange={(e) => uploadToCloudinary(e.target.files[0])}
          type="file"
          id="imgInput"
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Name */}
      <div className="mt-8">
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-muted">Your name</p>
        {!flag ? (
          <div className="flex items-center justify-between">
            <p className="font-sans text-base text-ink">{auth.reqUser?.full_name || 'username'}</p>
            <IconButton onClick={handleFlag} title="Edit name">
              <BsPencil />
            </IconButton>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              onKeyDown={handleUpdateName}
              onChange={handleChange}
              type="text"
              placeholder="Enter your name"
            />
            <IconButton onClick={handleCheckClick} title="Save">
              <BsCheck2 className="text-xl text-accent" />
            </IconButton>
          </div>
        )}
      </div>

      {/* Info rows */}
      <div className="mt-8 flex flex-col divide-y divide-line">
        {[
          ['Phone', '+123 456 789'],
          ['Status', 'Available'],
          ['Joined', 'March 2023'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-3">
            <span className="font-sans text-sm text-ink-muted">{label}</span>
            <span className="font-mono text-sm text-ink">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
