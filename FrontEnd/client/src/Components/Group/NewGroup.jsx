import { Button, CircularProgress } from '@mui/material';
import React, { useState } from 'react';
import { BsArrowLeft, BsCheck2 } from 'react-icons/bs';
import { useDispatch, useSelector } from 'react-redux';
import { createGroupChat } from '../../Redux/Chat/Action';

const NewGroup = ({ groupMember, setIsGroup }) => {
    const [isImageUploading, setIsImageUploading] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupImage, setGroupImage] = useState(null);
    const token = localStorage.getItem("jwt");

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsImageUploading(true);
            // Logic to upload the image can go here
            setTimeout(() => {
                setIsImageUploading(false);
                setGroupImage(file);
            }, 2000);
        }
    };

    const dispatch = useDispatch();

    const uploadToCloudinary = (pics) => {
        setIsImageUploading(true);
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
            setGroupImage(data.url.toString());
            setIsImageUploading(false);
        });
    };

    const { auth } = useSelector(store => store);

    const handleCreateGroup = () => {
        // Get the ID of the currently logged-in user
        const currentUserId = auth.reqUser.id; // Assuming you have the logged-in user's data in auth
    
        // Create a unique set of user IDs including the current user
        let userIds = [...new Set(groupMember.map(user => user.id))]; // Remove duplicates from groupMember
    
        // Include the current user if they are not already in the group
        if (!userIds.includes(currentUserId)) {
            userIds.push(currentUserId);
        }
    
        const group = {
            userIds,
            chat_name: groupName,
            chat_image: groupImage,
        };
        const data = {
            group,
            token,
        };
    
        // Dispatch the create group chat action
        dispatch(createGroupChat(data));
        console.log(setIsGroup);
    
        // Reset the state to close the group creation form
        setIsGroup(false);
    };
    

    return (
        <div className='w-full h-full'>
            <div className='flex items-center space-x-20 bg-white/10 backdrop-blur-lg text-white pt-16 px-10 pb-5'>
                <BsArrowLeft className='cursor-pointer text-2xl font-bold' />
                <p className='text-xl font-semibold'>New Group</p>
            </div>
            <div className='flex flex-col justify-center items-center my-12'>
                <label htmlFor="imgInput" className='relative'>
                    <img 
                        src={groupImage || "https://th.bing.com/th/id/OIP.JzfMMdGGxHVW3zepnVulsgHaHw?w=175&h=183&c=7&r=0&o=5&dpr=1.3&pid=1.7"} 
                        alt="Group" 
                        className='rounded-full w-24 h-24 object-cover' 
                    />
                    {isImageUploading && (
                        <CircularProgress className='absolute top-[3rem] left-[3rem]' />
                    )}
                </label>
                <input type="file" id='imgInput' className='hidden' onChange={(e) => uploadToCloudinary(e.target.files[0])} />
            </div>
            <div className='w-full flex justify-between items-center py-2 px-5'>
                <input
                    className='w-full outline-none border-b-2 border-white/10 px-2 bg-transparent'
                    placeholder='Group Subject'
                    value={groupName}
                    type='text'
                    onChange={(e) => setGroupName(e.target.value)}
                />
            </div>
            {groupName && (
                <div className='py-10 flex items-center justify-center'>
                    <Button onClick={handleCreateGroup} variant="contained" color="primary">
                        Create Group
                    </Button>
                    <div className='bg-white/10 backdrop-blur-lg rounded-full p-4'>
                        <BsCheck2 className='text-white font-bold text-3xl' />
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewGroup;
