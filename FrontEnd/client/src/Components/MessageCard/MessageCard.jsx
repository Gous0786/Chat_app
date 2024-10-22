import React from 'react';

const MessageCard = ({ isReqUserMessage, content }) => {
  return (
    <div
      className={`py-2 px-4 rounded-md max-w-[50%] w-fit ${
        isReqUserMessage 
          ? "self-end bg-white/20 backdrop-blur-lg rounded-tl-lg rounded-tr-lg shadow-lg text-white" // User messages
          : "self-start bg-white/20 backdrop-blur-lg rounded-tl-lg rounded-tr-lg shadow-lg text-white" // Other messages
      } backdrop-blur-lg`}
    >
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
};

export default MessageCard;
