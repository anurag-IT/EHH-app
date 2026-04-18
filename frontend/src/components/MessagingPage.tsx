import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../lib/api";
import { 
  Send, 
  MessageCircle, 
  X,
  Search,
  MoreVertical,
  ShieldCheck,
  Circle,
  Clock
} from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { motion, AnimatePresence } from "motion/react";
import { User, Message } from "../types";
import MessageBubble from "./messaging/MessageBubble";
import ChatInput from "./messaging/ChatInput";
import { useSocket } from "../context/SocketContext";

interface MessagingPageProps {
  currentUser: User;
}

export default function MessagingPage({ currentUser }: MessagingPageProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  
  const { socket, onlineUsers, typingUsers, sendMessage, sendTyping, markAsRead } = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get(`/api/messages/conversations/${currentUser.id}`);
      setConversations(res.data);
    } catch (err) {
      console.error("Fetch Conversations Error:", err);
    }
  }, [currentUser.id]);

  const fetchChat = useCallback(async (targetId: number, cursor?: number) => {
    if (cursor) setFetchingMore(true);
    else setLoading(true);

    try {
      const res = await api.get(`/api/messages/chat/${currentUser.id}/${targetId}?limit=30${cursor ? `&cursor=${cursor}` : ""}`);
      const newMessages = res.data;
      
      if (cursor) {
        setMessages(prev => [...newMessages, ...prev]);
        setHasMoreMessages(newMessages.length === 30);
      } else {
        setMessages(newMessages);
        setHasMoreMessages(newMessages.length === 30);
        markAsRead(targetId);
      }
    } catch (err) {
      console.error("Fetch Chat Error:", err);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }, [currentUser.id, markAsRead]);

  const loadMoreMessages = useCallback(() => {
    if (!hasMoreMessages || fetchingMore || messages.length === 0 || !selectedUser) return;
    fetchChat(selectedUser.id, messages[0].id);
  }, [hasMoreMessages, fetchingMore, messages, selectedUser, fetchChat]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedUser) {
      fetchChat(selectedUser.id);
    } else {
      setMessages([]);
    }
  }, [selectedUser, fetchChat]);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: Message) => {
      // If message is from the currently selected user
      if (selectedUser && (message.senderId === selectedUser.id || message.receiverId === selectedUser.id)) {
        setMessages(prev => {
          // Check for duplicate (if optimistic update already added it)
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        if (message.senderId === selectedUser.id) {
          markAsRead(selectedUser.id);
        }
      }
      
      // Update conversations list to show last message
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === (message.senderId === currentUser.id ? message.receiverId : message.senderId));
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            lastMessage: message.content,
            lastTimestamp: message.createdAt,
            unread: message.senderId !== currentUser.id && (!selectedUser || selectedUser.id !== message.senderId)
          };
          // Move to top
          const [moved] = updated.splice(index, 1);
          return [moved, ...updated];
        } else {
          fetchConversations(); // New conversation, just refresh
          return prev;
        }
      });
    };

    const handleMessagesRead = ({ readerId }: { readerId: number }) => {
      if (selectedUser && readerId === selectedUser.id) {
        setMessages(prev => prev.map(m => m.receiverId === readerId ? { ...m, isRead: true } : m));
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageSent", handleReceiveMessage);
    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageSent", handleReceiveMessage);
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [socket, selectedUser, currentUser.id, fetchConversations, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (virtuosoRef.current && messages.length > 0) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  const handleSendMessage = async (content: string) => {
    if (!selectedUser) return;
    sendMessage(selectedUser.id, content);
    sendTyping(selectedUser.id, false);
  };

  const handleTyping = (isTyping: boolean) => {
    if (!selectedUser) return;
    sendTyping(selectedUser.id, isTyping);
  };

  const MemoizedMessage = useCallback((index: number, message: Message) => {
    return (
      <MessageBubble 
        key={message.id}
        content={message.content}
        isSender={message.senderId === currentUser.id}
        timestamp={message.createdAt}
        isRead={message.isRead}
      />
    );
  }, [currentUser.id]);

  const otherUserTyping = selectedUser ? typingUsers.get(selectedUser.id) : false;

  return (
    <div className="max-w-[1920px] mx-auto h-[calc(100vh-140px)] flex gap-6 py-4 animate-in fade-in duration-500">
      {/* Sidebar: Conversations */}
      <div className={`
        ${selectedUser ? 'hidden md:flex' : 'flex'} 
        w-full md:w-[400px] bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl flex-col p-6 overflow-hidden
      `}>
        <div className="px-4 mb-8">
          <div className="mb-6">
            <div className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] mb-1">CONNECTIONS</div>
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-black text-white tracking-tight">Inbox</h1>
              <div className="flex items-center bg-slate-800/50 rounded-full p-1 border border-slate-700/50">
                <div className="flex -space-x-3 mr-2 px-1">
                  {conversations.slice(0, 2).map((c, i) => (
                    <img key={i} src={c.avatar} className="w-6 h-6 object-cover rounded-full border-2 border-slate-900" style={{ zIndex: 10 - i }} />
                  ))}
                  {conversations.length === 0 && (
                     <div className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-700" />
                  )}
                </div>
                <div className="bg-green-500/20 text-green-500 text-[9px] font-black px-2 py-1 rounded-full">+12</div>
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-green-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800 border border-transparent focus:border-green-500/50 outline-none text-[11px] font-bold uppercase tracking-widest transition-all shadow-inner text-white placeholder-slate-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.1)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 px-2 chat-scrollbar">
          {conversations.map(c => {
            const isOnline = onlineUsers.has(c.id);
            const isSelected = selectedUser?.id === c.id;
            return (
              <button 
                key={c.id} 
                onClick={() => setSelectedUser(c)}
                className={`w-full flex items-center gap-4 p-4 rounded-[2.2rem] transition-all duration-300 relative group
                  ${isSelected 
                    ? 'bg-green-500 text-slate-900 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
                    : 'hover:bg-slate-800 border border-transparent hover:border-slate-700/50'}
                `}
              >
                <div className="relative">
                  <img src={c.avatar} className="w-14 h-14 rounded-[1.4rem] object-cover shadow-sm bg-slate-800 p-0.5" />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] ${isSelected ? 'border-green-500' : 'border-slate-900'} ${isOnline ? 'bg-green-500' : 'bg-slate-600'}`} />
                </div>
                
                <div className="flex-1 text-left min-w-0">
                   <div className="flex justify-between items-center mb-0.5">
                     <div className={`text-[12px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-slate-900' : 'text-white'}`}>{c.name}</div>
                     <span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-slate-900/60' : 'text-slate-500'}`}>
                       {c.lastTimestamp ? new Date(c.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                     </span>
                   </div>
                   <div className={`text-[10px] font-medium truncate ${isSelected ? 'text-slate-900/80' : 'text-slate-400'}`}>
                      {typingUsers.get(c.id) ? (
                        <span className={`${isSelected ? 'text-slate-900' : 'text-green-500'} animate-pulse italic`}>Typing transmission...</span>
                      ) : (
                        c.lastMessage || 'Open shared link...'
                      )}
                   </div>
                </div>

                {c.unread && (
                  <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'} shrink-0`} />
                )}
              </button>
            );
          })}
          
          {conversations.length === 0 && (
            <div className="py-20 text-center opacity-70">
               <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
                <MessageCircle size={32} className="text-slate-500" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-10">No active transmissions detected in your sector.</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-6 right-6 z-10 md:hidden">
           <button className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:bg-green-400 active:scale-95 transition-all text-slate-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
           </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className={`
        ${!selectedUser ? 'hidden md:flex' : 'flex'} 
        flex-1 bg-slate-900 border border-slate-800 rounded-[3.5rem] shadow-2xl flex-col overflow-hidden relative
      `}>
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl z-20 sticky top-0">
               <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                  <div className="relative">
                    <img src={selectedUser.avatar} className="w-12 h-12 rounded-2xl object-cover bg-slate-800 shadow-sm border border-slate-700" />
                    {onlineUsers.has(selectedUser.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black text-white uppercase tracking-tighter">{selectedUser.name}</div>
                      <ShieldCheck size={14} className="text-green-500" />
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 h-4">
                      {onlineUsers.has(selectedUser.id) ? (
                        <span className="text-green-500 flex items-center gap-1.5">
                           <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                          </span>
                          Online
                        </span>
                      ) : (
                        <span className="text-slate-500">Offline</span>
                      )}
                    </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                 <button className="p-3 text-slate-500 hover:text-green-500 hover:bg-slate-800 rounded-2xl transition-all">
                   <Search size={18} />
                 </button>
                 <button className="p-3 text-slate-500 hover:text-green-500 hover:bg-slate-800 rounded-2xl transition-all">
                   <MoreVertical size={18} />
                 </button>
               </div>
            </div>

            {/* Virtualized Messages List */}
            <div className="flex-1 bg-slate-900/50 relative">
              <Virtuoso
                ref={virtuosoRef}
                data={messages}
                initialTopMostItemIndex={messages.length - 1}
                itemContent={MemoizedMessage}
                startReached={loadMoreMessages}
                followOutput="auto"
                className="chat-scrollbar"
                style={{ height: '100%' }}
                components={{
                  Footer: () => (
                    <div className="h-12 flex items-center px-10 gap-2 mb-4">
                      <AnimatePresence>
                        {otherUserTyping && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-2 text-green-500 font-black text-[9px] uppercase tracking-widest bg-slate-800 px-4 py-2 rounded-full border border-slate-700/50"
                          >
                            <span>Receiving Signal</span>
                            <div className="flex gap-1 items-center">
                              <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                              <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ),
                  Header: () => (
                    <div className="py-4 flex justify-center">
                      {fetchingMore && (
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500 tracking-widest">
                           <div className="w-3 h-3 border-2 border-slate-700 border-t-green-500 rounded-full animate-spin" />
                           Syncing History...
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            </div>

            {/* Input Controls */}
            <div className="px-8 pb-8 pt-4">
               <ChatInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-10 relative overflow-hidden">
             {/* Background Pattern */}
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="grid grid-cols-12 gap-4 h-full">
                  {Array(144).fill(0).map((_, i) => (
                    <div key={i} className="aspect-square border border-green-500 rounded-sm" />
                  ))}
                </div>
             </div>
             
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="relative"
             >
               <div className="w-32 h-32 bg-green-500 text-slate-900 rounded-[3.5rem] shadow-[0_0_50px_rgba(34,197,94,0.3)] flex items-center justify-center relative z-10">
                  <MessageCircle size={56} className="animate-pulse" />
               </div>
               <div className="absolute -inset-6 bg-green-500/10 rounded-[4rem] -z-10 animate-pulse transition-all"></div>
             </motion.div>
             
             <div className="text-center space-y-6 max-w-sm relative z-10">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Secure Link</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] leading-loose px-8">
                  Establish a secure connection to begin low-latency communication across the orbital network.
                </p>
                <div className="pt-8">
                   <button onClick={fetchConversations} className="px-10 py-5 bg-green-500 text-slate-900 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:scale-105 hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-95 transition-all">
                     Initialize Protocol
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
