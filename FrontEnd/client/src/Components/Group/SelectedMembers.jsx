import React from 'react';
import { AiOutlineClose } from 'react-icons/ai';

const SelectedMembers = ({ handleRemoveMember, member }) => {
    return (
        <div className='flex items-center rounded-full bg-white/20 backdrop-blur-lg shadow-lg p-1 m-1'>
            <img 
                className='w-7 h-7 rounded-full' 
                src={member.profile_picture}  // Dynamically using member's profile picture
                alt=""
            />
            <p className='px-2'>{member.full_name}</p> {/* Accessing member's full_name */}
            <AiOutlineClose onClick={handleRemoveMember} className='pr-1 cursor-pointer' />
        </div>
    );
};

export default SelectedMembers;
