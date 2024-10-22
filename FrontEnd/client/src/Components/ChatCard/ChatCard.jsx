import React from 'react';

const ChatCard = ({ userImg,name }) => {
  return (
    <div className='flex items-center justify-center py-2 group cursor-pointer'>
      <div className='w-[20%]'>
        <img
          className='h-14 w-14 rounded-full'
          src={userImg}
          
        />
      </div>
      <div className='pl-5 w-[80%]'>
        <div className='flex justify-between items-center'>
          <p className='text-lg'>{name}</p> {/* Fixed interpolation */}
          <p className='text-sm'></p> {/* Fixed interpolation */}
        </div>
        <div className='flex justify-between items-center'>
          
          <div className='flex space-x-2 items-center'>
           
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatCard;
