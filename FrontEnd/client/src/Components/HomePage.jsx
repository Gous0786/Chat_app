import React, { useEffect, useRef, useState } from 'react';
import { AiOutlineSearch } from 'react-icons/ai';
import { BiCommentDetail } from 'react-icons/bi';
import { BsEmojiSmile, BsFilter, BsThreeDotsVertical } from 'react-icons/bs';
import { TbCircleDashed } from 'react-icons/tb';
import { IoSend } from 'react-icons/io5';
import ChatCard from './ChatCard/ChatCard';
import MessageCard from './MessageCard/MessageCard';
import { ImAttachment } from 'react-icons/im';
import { useNavigate } from 'react-router-dom';
import Profile from './Profile/Profile';
import CreateGroup from './Group/CreateGroup';
import { useDispatch, useSelector } from 'react-redux';
import { currentUser, logoutAction, searchUser } from '../Redux/Auth/Action';
import { createChat, getUsersChat } from '../Redux/Chat/Action';
import { createMessage, getAllMessages } from '../Redux/Message/Action';
import SockJS from 'sockjs-client/dist/sockjs';
import {over} from "stompjs";
import LiquidGlass from './ui/LiquidGlass';
import Input from './ui/Input';
import IconButton from './ui/IconButton';
import Avatar from './ui/Avatar';
import ScrollArea from './ui/ScrollArea';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/DropdownMenu';
import { motion } from 'framer-motion';
import { ensureSession, encryptForPeer, decryptFromPeer } from '../signal/session';
import { signalStore } from '../signal/store';

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
  const [isConnect,setIsConnect]=useState(false);
  const [messages,setMessages]=useState([]);
  // Raw messages (ciphertext) mapped to display text via decryption/cache.
  const [renderMessages, setRenderMessages] = useState([]);
  // Plaintext of the message we just sent, so our own bubble shows plaintext.
  const pendingPlaintextRef = useRef(null);

  const handleClickOnChatCard = (userId) => {
    //setCurrentChat(item)
    dispatch(createChat({token,data:{userId}}))
    setQuerys("");
  };
  const handleSearch = (keyword) => {
    dispatch(searchUser({keyword, token}))
  };
  

  const handleCreateNewMessage = async () => {
    if (!currentChat?.id || !content.trim()) {
        return;
    }

    const plaintext = content;
    setContent(""); // clear the input immediately so Enter can't re-send

    const peerId = getPeerUserId(currentChat);
    if (peerId) {
      // 1:1 chat → encrypt with the Signal session before it leaves the browser.
      try {
        await ensureSession(peerId, token);
        const envelope = await encryptForPeer(peerId, plaintext);
        // Remember what we typed so our own bubble shows plaintext (we can't
        // decrypt our own outgoing ciphertext with the ratchet).
        pendingPlaintextRef.current = plaintext;
        dispatch(createMessage({ token, data: { chatId: currentChat.id, content: envelope, encrypted: true } }));
      } catch (e) {
        console.error("encryption failed, message not sent:", e);
      }
    } else {
      // group / fallback → plaintext (groups are disabled in Stage 7)
      dispatch(createMessage({ token, data: { chatId: currentChat.id, content: plaintext } }));
    }
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
    if (message.newMessage && stompClient) {
      const nm = message.newMessage;
      // Cache the plaintext of our own just-sent message keyed by its server id,
      // so our bubble renders plaintext (we can't decrypt our own ciphertext).
      if (nm.encrypted && pendingPlaintextRef.current != null && nm.id != null) {
        signalStore.cachePlaintext(nm.id, pendingPlaintextRef.current);
        pendingPlaintextRef.current = null;
      }
      // functional update: don't depend on a stale `messages` snapshot
      setMessages((prev) => [...prev, nm]);
      stompClient?.send("/app/message", {}, JSON.stringify(nm));
    }
  }, [message.newMessage]);


  // Subscribe once per (chat, connection) — NOT on every render.
  // Without the dependency array this re-subscribed on every render, so a
  // single incoming message was delivered by many stacked subscriptions,
  // producing duplicate bubbles.
  useEffect(() => {
    if (isConnect && stompClient && auth.reqUser && currentChat) {
      const subscription = stompClient.subscribe(
        "/group/" + currentChat.id.toString(),
        onMessageRecieve
      );
      return () => {
        subscription.unsubscribe();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnect, stompClient, auth.reqUser, currentChat]);

  const onMessageRecieve = (payload) => {
    const receivedMessage = JSON.parse(payload.body);
    setMessages((prev) => [...prev, receivedMessage]);
  };

  useEffect(()=>{
   setMessages(message.messages)
  },[message.messages])

  // Map raw messages (which may be ciphertext) to display text. Encrypted
  // messages are decrypted once and their plaintext cached; already-cached and
  // legacy plaintext messages pass through. Runs whenever the raw list changes.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const list = messages || [];
      const out = [];
      for (const msg of list) {
        if (!msg.encrypted) {
          out.push({ ...msg, displayText: msg.content });
          continue;
        }
        // cached (our own sends, or previously decrypted)?
        const cached = msg.id != null ? await signalStore.getCachedPlaintext(msg.id) : undefined;
        if (cached !== undefined) {
          out.push({ ...msg, displayText: cached });
          continue;
        }
        const isMine = msg.user?.id === auth.reqUser?.id;
        if (isMine) {
          // our own ciphertext we can't decrypt and haven't cached yet
          out.push({ ...msg, displayText: "[sent]" });
          continue;
        }
        // incoming: decrypt once, then cache
        try {
          const text = await decryptFromPeer(msg.user.id, msg.content);
          if (msg.id != null) await signalStore.cachePlaintext(msg.id, text);
          out.push({ ...msg, displayText: text });
        } catch (e) {
          out.push({ ...msg, displayText: "[unable to decrypt]", decryptFailed: true });
        }
      }
      if (!cancelled) setRenderMessages(out);
    };
    run();
    return () => { cancelled = true; };
  }, [messages, auth.reqUser?.id]);
  
  
  const handleNavigate = () => {
    setIsProfile(true);
  };

  const handleCloseOpenProfile = () => {
    setIsProfile(false);
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

  // The other participant in a 1:1 chat (null for groups / not-ready state).
  const getPeerUserId = (chatItem) => {
    if (!chatItem || chatItem.group === true || !chatItem.users) return null;
    const other = chatItem.users.find((u) => u.id !== auth.reqUser?.id);
    return other?.id ?? null;
  };

  // Establish a Signal session with the peer when a 1:1 chat is opened.
  useEffect(() => {
    const peerId = getPeerUserId(currentChat);
    if (peerId && token) {
      ensureSession(peerId, token).catch((e) =>
        console.error("ensureSession failed:", e)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat, token]);

  


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
    <div className="flex h-screen bg-canvas text-ink">
      {/* ===== Sidebar ===== */}
      <div className="w-[340px] h-full bg-surface border-r border-line flex flex-col">
        {isProfile && <Profile handleCloseOpenProfile={handleCloseOpenProfile} />}
        {isGroup && <CreateGroup setIsGroup={setIsGroup} />}

        {!isProfile && !isGroup && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4">
              <button
                onClick={handleNavigate}
                className="flex items-center gap-3 rounded-xl p-1 pr-3 transition-colors hover:bg-glass"
              >
                <Avatar src={auth.reqUser?.profile_picture} name={auth.reqUser?.full_name} size="sm" />
                <span className="font-sans text-sm font-medium">{auth.reqUser?.full_name}</span>
              </button>
              <div className="flex items-center gap-1 text-lg">
                <IconButton title="Status"><TbCircleDashed /></IconButton>
                <IconButton title="Chats"><BiCommentDetail /></IconButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton title="Menu"><BsThreeDotsVertical /></IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleNavigate}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleCreateGroup}>Create Group</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleLogout} className="text-red-400">Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-4 pb-3">
              <div className="relative flex-1">
                <AiOutlineSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <Input
                  className="pl-10"
                  placeholder="Search or start a new chat"
                  onChange={(e) => {
                    setQuerys(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  value={querys}
                />
              </div>
              <IconButton title="Filter"><BsFilter /></IconButton>
            </div>

            {/* Contacts */}
            <ScrollArea className="flex-1" viewportClassName="px-2 pb-3">
              {querys && Array.isArray(auth.searchUser) && auth.searchUser.length > 0 ? (
                auth.searchUser.map((item, index) => (
                  <div onClick={() => handleClickOnChatCard(item.id)} key={index}>
                    <ChatCard name={item.full_name} userImg={item.profile_picture} />
                  </div>
                ))
              ) : querys ? (
                <p className="px-4 py-6 text-center text-sm text-ink-muted">No users found</p>
              ) : chat.chats.length > 0 ? (
                chat.chats.map((item, index) => {
                  const isGroupChat = item.group === true;
                  const other =
                    auth.reqUser?.id !== item.users?.[0]?.id ? item.users?.[0] : item.users?.[1];
                  const name = isGroupChat
                    ? item.chat_name || 'Unnamed Group'
                    : other?.full_name;
                  const img = isGroupChat ? item.chat_image : other?.profile_picture;
                  return (
                    <div key={index} onClick={() => handleCurrentChat(item)}>
                      <ChatCard
                        isChat={!isGroupChat}
                        name={name}
                        userImg={img}
                        selected={currentChat?.id === item.id}
                      />
                    </div>
                  );
                })
              ) : (
                <p className="px-4 py-6 text-center text-sm text-ink-muted">No chats found</p>
              )}
            </ScrollArea>
          </>
        )}
      </div>

      {/* ===== Chat pane ===== */}
      <div className="relative flex-1 h-full flex flex-col overflow-hidden">
        {/* ambient gold wash */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(700px 400px at 75% 0%, rgba(228,197,144,0.06), transparent 60%)',
          }}
        />

        {!currentChat && (
          <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <BiCommentDetail className="mx-auto mb-6 text-5xl text-ink-muted" />
              <h2 className="font-display text-4xl text-ink">Select a conversation</h2>
              <p className="mx-auto mt-3 max-w-sm font-sans text-sm text-ink-muted">
                Choose a chat from the left, or search for someone to start a new one.
              </p>
            </motion.div>
          </div>
        )}

        {currentChat && (
          <div className="relative z-10 flex h-full flex-col">
            {/* Floating glass header */}
            <LiquidGlass className="mx-4 mt-4 flex items-center gap-3 rounded-2xl px-4 py-3">
              <Avatar
                size="sm"
                name={
                  currentChat.group === true
                    ? currentChat.chat_name
                    : (auth.reqUser?.id === currentChat.users[0]?.id
                        ? currentChat.users[1]?.full_name
                        : currentChat.users[0]?.full_name)
                }
                src={
                  currentChat.group === true
                    ? currentChat.chat_image
                    : (auth.reqUser?.id !== currentChat.users[0]?.id
                        ? currentChat.users[0]?.profile_picture
                        : currentChat.users[1]?.profile_picture)
                }
              />
              <div className="relative flex-1">
                <p className="font-sans text-sm font-medium">
                  {currentChat.group === true
                    ? currentChat.chat_name || 'Unnamed Group'
                    : (auth.reqUser?.id === currentChat.users[0]?.id
                        ? currentChat.users[1]?.full_name
                        : currentChat.users[0]?.full_name)}
                </p>
                <p className="font-mono text-[10px] text-accent">online</p>
              </div>
              <IconButton title="Search"><AiOutlineSearch /></IconButton>
            </LiquidGlass>

            {/* Messages */}
            <ScrollArea className="flex-1" viewportClassName="px-6 py-6">
              <div className="flex flex-col gap-3">
                {renderMessages.length > 0 &&
                  renderMessages.map((item, i) => (
                    <MessageCard
                      key={i}
                      isReqUserMessage={item.user.id === auth.reqUser.id}
                      content={item.displayText}
                      timestamp={item.timestamp}
                      encrypted={item.encrypted}
                      decryptFailed={item.decryptFailed}
                    />
                  ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Floating glass composer */}
            <LiquidGlass className="mx-4 mb-4 flex items-center gap-2 rounded-2xl px-3 py-2.5">
              <IconButton title="Attach"><ImAttachment /></IconButton>
              <input
                className="relative flex-1 bg-transparent px-1 font-sans text-sm text-ink outline-none placeholder:text-ink-muted"
                placeholder="Type a message…"
                onChange={(e) => setContent(e.target.value)}
                value={content}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNewMessage();
                }}
              />
              <IconButton title="Emoji"><BsEmojiSmile /></IconButton>
              <button
                onClick={handleCreateNewMessage}
                className="relative grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-fg shadow-glow transition-transform hover:-translate-y-0.5"
                title="Send"
              >
                <IoSend />
              </button>
            </LiquidGlass>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
