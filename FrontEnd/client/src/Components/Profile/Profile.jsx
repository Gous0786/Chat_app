import React, { useState } from 'react';
import { BsArrowLeft, BsCheck2, BsPencil } from 'react-icons/bs';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateUser } from '../../Redux/Auth/Action';

const Profile = ({handleCloseOpenProfile}) => {
  const [flag, setFlag] = useState(false);
  const [username, setUsername] = useState(null);
  const { auth } = useSelector(store => store);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tempPicture, setTempPicture] = useState(null);

  const handleFlag = () => {
    setFlag(true);
  };

  const handleCheckClick = () => {
    const data = {
      id: auth.reqUser?.id,
      token: localStorage.getItem("jwt"),
      data: { full_name: username },
    };
    dispatch(updateUser(data));
    setFlag(false);
  };

  const handleChange = (e) => {
    setUsername(e.target.value);
  };

  const handleUpdateName = (e) => {
    if (e.key === "Enter") {
      const data = {
        id: auth.reqUser?.id,
        token: localStorage.getItem("jwt"),
        data: { full_name: username },
      };
      dispatch(updateUser(data));
      setFlag(false);
    }
  };

  const uploadToCloudinary = (pics) => {
    const data = new FormData();
    data.append("file", pics);
    data.append("upload_preset", "profile_images");
    data.append("cloud_name", "dvrgsndeq");

    fetch("https://api.cloudinary.com/v1_1/dvrgsndeq/image/upload", {
      method: "POST",
      body: data,
    })
    .then((res) => res.json())
    .then((data) => {
      setTempPicture(data.url.toString());

      const dataa = {
        id: auth.reqUser.id,
        token: localStorage.getItem("jwt"),
        data: { profile_picture: data.url.toString() },
      };
      dispatch(updateUser(dataa));
    });
  };

  return (
    <div className="h-full w-full flex flex-col p-6 bg-white/20 backdrop-blur-lg rounded-xl shadow-lg">
      {/* Header with Back Arrow */}
      <div className="flex items-center space-x-4 pb-4 border-b border-gray-300">
        <BsArrowLeft className="text-2xl cursor-pointer" onClick={handleCloseOpenProfile} />
        <h2 className="text-lg font-semibold">Profile</h2>
      </div>

      {/* Profile Details */}
      <div className="mt-6 space-y-4">
        <label htmlFor="imgInput">
          <img 
            className="w-24 h-24 rounded-full mx-auto"
            src={auth.reqUser?.profile_picture || tempPicture || "https://th.bing.com/th/id/OIP.WRzZJlYLzOB8y3yeI5MvfgAAAA?rs=1&pid=ImgDetMain"} 
            alt="User"
          />
        </label>
        <input onChange={(e) => uploadToCloudinary(e.target.files[0])} type="file" id="imgInput" className="hidden" />

        <div>
          <p className="py-3">Your Name</p>
          {!flag && (
            <div className="w-full flex justify-between items-center">
              <p className="py-3">{auth.reqUser.full_name || "username"}</p>
              <BsPencil onClick={handleFlag} className="cursor-pointer" />
            </div>
          )}
          {flag && (
            <div className="w-full flex justify-between items-center py-2">
              <input onKeyPress={handleUpdateName} onChange={handleChange} type="text" placeholder="Enter your Name" />
              <BsCheck2 onClick={handleCheckClick} className="cursor-pointer text-2xl" />
            </div>
          )}
        </div>

        {/* Additional Profile Details */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Phone</span>
            <span className="font-medium">+123 456 789</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status</span>
            <span className="font-medium">Available</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Joined</span>
            <span className="font-medium">March 2023</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
