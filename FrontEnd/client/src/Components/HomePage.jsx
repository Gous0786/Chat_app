import React, { useEffect, useRef, useState } from 'react';
import { AiOutlineSearch } from 'react-icons/ai';
import { BiCommentDetail } from 'react-icons/bi';
import { BsEmojiSmile, BsFilter, BsThreeDotsVertical } from 'react-icons/bs';
import { TbCircleDashed } from 'react-icons/tb';
import ChatCard from './ChatCard/ChatCard';
import MessageCard from './MessageCard/MessageCard';
import { ImAttachment } from 'react-icons/im';
import "./HomePage.css";
import { useNavigate } from 'react-router-dom';
import Profile from './Profile/Profile';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CreateGroup from './Group/CreateGroup';
import { useDispatch, useSelector } from 'react-redux';
import { currentUser, logoutAction, searchUser } from '../Redux/Auth/Action';
import { createChat, getUsersChat } from '../Redux/Chat/Action';
import { create } from '@mui/material/styles/createTransitions';
import { createMessage, getAllMessages } from '../Redux/Message/Action';
import SockJS from 'sockjs-client/dist/sockjs';
import {over} from "stompjs";
import { FaBullseye } from 'react-icons/fa6';

const HomePage = () => {
  const [querys, setQuerys] = useState('');
  const dispatch = useDispatch();
  const [currentChat, setCurrentChat] = useState(null);
  const [content, setContent] = useState("");
  const [isProfile, setIsProfile] = useState(false);
  const navigate = useNavigate();
  const {auth,chat,message} = useSelector(store => store);
  const token = localStorage.getItem("jwt");

  const [stompClient, setStompClient]=useState();
  const [isConnect,setIsConnect]=useState(FaBullseye);
  const [messages,setMessages]=useState([]);

  const handleClickOnChatCard = (userId) => {
    //setCurrentChat(item)
    dispatch(createChat({token,data:{userId}}))
    setQuerys("");
  };
  const handleSearch = (keyword) => {
    dispatch(searchUser({keyword, token}))
  };
  

  const handleCreateNewMessage = () => {
    console.log("Current Chat ID:", currentChat.id);
    console.log("Content:", content);

    if (!currentChat.id || !content) {
        console.error("Chat ID or content is missing.");
        return;
    }

    dispatch(createMessage({ token, data: { chatId: currentChat.id, content } }));
    console.log("Create new message dispatched.");
};


const connect = () => {
  const sock = new SockJS("http://localhost:5454/websocket");
  const temp = over(sock);
  setStompClient(temp);

  const headers = {
    Authorization: `Bearer ${token}`,
    "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
  };

  temp.connect(headers, onConnect, onError);
};


  useEffect(()=>{
 connect();
  },[])
  
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
  }
  const onError=(error)=>{
   console.log("on error ",error)
  }

  const onConnect = () => {
    setIsConnect(true);
    console.log("WebSocket connected");
  };
  

  useEffect(() => {
    console.log("ready to send");
    if (message.newMessage && stompClient) {
      console.log("sending..." ,message.newMessage);

      setMessages([...messages, message.newMessage]);
      stompClient?.send("/app/message", {}, JSON.stringify(message.newMessage));
    }
  }, [message.newMessage]);


  useEffect(() => {
    console.log('Checking conditions for subscription...');
    console.log('isConnect:', isConnect);
    console.log('stompClient:', stompClient);
    console.log('auth.reqUser:', auth.reqUser);
    console.log('currentChat:', currentChat);
    if (isConnect && stompClient && auth.reqUser && currentChat) {
      console.log("connected to receive");
      const subscription = stompClient.subscribe("/group/" + currentChat.id.toString(), onMessageRecieve);
      console.log("------->hello")
  
      // Cleanup function to unsubscribe
      return () => {
        subscription.unsubscribe();
      };
    }
  }, ); // Dependency array added
  
  const onMessageRecieve = (payload) => {
    console.log(payload)
    const receivedMessage = JSON.parse(payload.body); // Parse once
    console.log("received message", receivedMessage); // Fixed typo
    setMessages([...messages, receivedMessage]);
  }

  useEffect(()=>{
   setMessages(message.messages)
  },[message.messages])
  
  
  const handleNavigate = () => {
    setIsProfile(true);
  };

  const handleCloseOpenProfile = () => {
    setIsProfile(false);
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  

  const [isGroup, setIsGroup] = useState(false);
  const handleCreateGroup = () => {
    setIsGroup(true);
  };

  // Loading state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Fetching current user");
    if (token) {
      dispatch(currentUser(token)).then(() => {
        setLoading(false); // Set loading to false after fetching user
      });
    } else {
      setLoading(false); // No token, stop loading
    }
  }, [dispatch, token]);

  useEffect(() => {
    console.log("Checking auth state");
    if (!loading) { // Only check after loading is done
      if (!auth.reqUser) {
        navigate("/signup");
      }
    }
  }, [auth.reqUser, loading, navigate ,dispatch, token]);

  const handleLogout = () => {
    dispatch(logoutAction());
    navigate("/signup");
  };
  useEffect(()=>{
    console.log("Chat data:", chat.chats);

    dispatch(getUsersChat({token}))
  },[chat.createdChat,chat.createdGroup,dispatch, token])

  const handleCurrentChat=(item)=>{
    setCurrentChat(item)
  }

  


  useEffect(()=>{

    
    
    if(currentChat?.id)
    dispatch(getAllMessages({chatId:currentChat.id,token}))
 
  },[currentChat,message.newMessage])



  const bottomRef = useRef(null); // Ref for the last message
  
  // Function to scroll to the bottom
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom(); // Scroll when messages are updated
  }, [messages]);




  return (
    <div className='flex h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-8'>
      {/* Left Div (Contacts) */}
      <div className="w-[30%] h-full bg-white/20 backdrop-blur-lg rounded-l-lg p-4 shadow-lg">
        <div className='w-full h-full flex flex-col'>
          {/* Profile */}
          {isProfile && <Profile handleCloseOpenProfile={handleCloseOpenProfile} />}
          {isGroup && <CreateGroup setIsGroup={setIsGroup}/>}
          {/* Home */}
          {!isProfile && !isGroup && (
            <div className='flex justify-between items-center p-3'>
              <div onClick={handleNavigate} className='flex items-center space-x-3'>
                <img className='rounded-full w-10 h-10 cursor-pointer' src={auth.reqUser?.profile_picture || ""} alt="User" />
                <p>{auth.reqUser?.full_name}</p>
              </div>
              <div className='space-x-3 text-2xl flex'>
                <TbCircleDashed />
                <BiCommentDetail />
                <div>
                  <BsThreeDotsVertical id="basic-button"
                    aria-controls={open ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick} />
                  <Menu
                    id="basic-menu"
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                      'aria-labelledby': 'basic-button',
                    }}
                  >
                    <MenuItem onClick={handleClose}>Profile</MenuItem>
                    <MenuItem onClick={handleCreateGroup}>Create Group</MenuItem>
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                  </Menu>
                </div>
              </div>
            </div>
          )}

          {/* Search Input */}
          {!isProfile && !isGroup && (
            <div className='relative flex items-center py-4 px-2'>
              <input
                className='border-none outline-none bg-white/20 backdrop-blur-lg rounded-md w-full pl-10 py-2'
                type='text'
                placeholder='Search or Start new Chat'
                onChange={(e) => {
                  setQuerys(e.target.value);
                  handleSearch(e.target.value);
                }}
                value={querys}
              />
              <AiOutlineSearch className='absolute left-3 text-xl' />
              <BsFilter className='ml-4 text-3xl' />
            </div>
          )}

          {/* Contacts List */}{!isProfile && !isGroup && (
          <div className="bg-white/20 backdrop-blur-lg rounded-xl overflow-y-auto flex-grow px-3">
  {/* Check if the search query is active and there are search results */}
  {querys && Array.isArray(auth.searchUser) && auth.searchUser.length > 0 ? (
    auth.searchUser.map((item, index) => (
      <div onClick={() => handleClickOnChatCard(item.id)} key={index}>
        <hr />
        <ChatCard
              name={item.full_name}
              userImg={
                item.profile_picture ||
                "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png"
              }
            />
      </div>
    ))
  ) : querys ? (
    <p>No users found</p>  
  ) : (
    /* Render chats if there is no search query */
    chat.chats.length > 0 ? (
      chat.chats.map((item, index) => (
        <div key={index} onClick={() => handleCurrentChat(item)}>
          <hr />
          {/* Check if it's a group chat */}
          {item.group===true ? (
            // Group chat card
            <ChatCard
              name={item.chat_name || "Unnamed Group"} // Ensure group name is used
              userImg={
                item.chat_image ||
                "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png"
              }
            />
          ) : (
            // Individual chat card
            <ChatCard
              isChat={true}
              name={
                auth.reqUser?.id !== item.users[0]?.id
                  ? item.users[0].full_name
                  : item.users[1].full_name
              }
              userImg={
                auth.reqUser?.id !== item.users[0]?.id
                  ? item.users[0].profile_picture ||
                    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png"
                  : item.users[1].profile_picture ||
                    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png"
              }
            />
          )}
        </div>
      ))
    ): (
      <p>No chats found</p> 
    )
  )}
</div>)}


        </div>
      </div>

      {/* Right Div (Chats) */}
      <div className="w-[70%] h-full bg-white/20 backdrop-blur-lg rounded-r-lg p-4 shadow-lg">
      {!currentChat && (
        <div className="flex justify-center items-center min-h-full w-full">
          <div className="relative p-10 bg-white/30 backdrop-blur-md rounded-full shadow-lg">
            <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-white/30 backdrop-blur-md rounded-full"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 16.5A3.5 3.5 0 0117.5 20h-11l-4 4V6.5A3.5 3.5 0 016.5 3h11A3.5 3.5 0 0121 6.5v10z" />
            </svg>
          </div>
        </div>
      )}
      {currentChat && (
        <div className="h-full flex flex-col">
          <div className="header bg-white/20 backdrop-blur-lg rounded-l-lg shadow-lg top-0 rounded-xl shadow-md">
            <div className="flex justify-between">
              <div className="py-3 space-x-4 flex items-center px-3">
                <img
                  className="w-10 h-10 rounded-full"
                  src={currentChat.group === true
                    ? currentChat.chat_image || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png"
                    : (auth.reqUser?.id !== currentChat.users[0]?.id
                      ? currentChat.users[0].profile_picture || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png"
                      : currentChat.users[1].profile_picture || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png")}
                  alt=""
                />
                <p>
                  {currentChat.group === true
                    ? currentChat.chat_name || "Unnamed Group"
                    : (auth.reqUser?.id === currentChat.users[0]?.id
                      ? currentChat.users[1]?.full_name
                      : currentChat.users[0]?.full_name)}
                </p>
              </div>
              <div className="py-3 space-x-4 items-center px-3">
                <AiOutlineSearch />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="px-10 h-[calc(100vh-250px)] overflow-y-auto space-y-2">
            <div className="flex flex-col space-y-4">
              {console.log("messages are ", message.messages)}
              {messages.length > 0 && messages.map((item, i) => (
                <MessageCard
                  key={i}
                  isReqUserMessage={item.user.id === auth.reqUser.id}
                  content={item.content}
                />
              ))}
              {/* Add the reference to the last message */}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Message input */}
          <div className="bg-white/20 backdrop-blur-lg rounded-l-lg shadow-lg p-3">
            <div className="flex items-center space-x-4">
              <ImAttachment className="text-2xl" />
              <input
                className="border-none outline-none bg-white/20 backdrop-blur-lg rounded-md w-full py-2 px-4"
                placeholder="Type a message..."
                onChange={(e) => setContent(e.target.value)}
                value={content}
              />
              <button onClick={handleCreateNewMessage}>Send</button>
              <BsEmojiSmile className="text-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default HomePage;
