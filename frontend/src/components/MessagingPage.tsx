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
  Clock,
  ChevronLeft
} from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { motion, AnimatePresence } from "motion/react";
import { User, Message } from "../types";
import MessageBubble from "./messaging/MessageBubble";
import ChatInput from "./messaging/ChatInput";
import { useSocket } from "../context/SocketContext";
import OptimizedImage from "./common/OptimizedImage";

interface MessagingPageProps {
  currentUser: User;
  initialUser?: User | null;
}

export default function MessagingPage({ currentUser, initialUser }: MessagingPageProps) {
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

  useEffect(() => {
    if (initialUser) {
      // Check if conversation already exists
      const existing = conversations.find(c => c.id === initialUser.id);
      if (existing) {
        setSelectedUser(existing);
      } else {
        // Temp user for starting conversation
        setSelectedUser(initialUser);
      }
    }
  }, [initialUser, conversations.length]);

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
    <div className="max-w-[1400px] mx-auto h-[calc(100vh-140px)] flex gap-4 py-4 animate-in fade-in duration-700">
      {/* Sidebar: Conversations */}
      <div className={`
        ${selectedUser ? 'hidden md:flex' : 'flex'} 
        w-full md:w-[350px] bg-slate-900 border border-slate-800/50 rounded-[2.5rem] shadow-2xl flex-col overflow-hidden
      `}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black text-white tracking-tight">Messages</h1>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors border border-slate-700">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-transparent focus:border-blue-500/30 outline-none text-sm font-medium transition-all text-white placeholder-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 px-4 chat-scrollbar pb-8">
          {conversations.map(c => {
            const isOnline = onlineUsers.has(c.id);
            const isSelected = selectedUser?.id === c.id;
            return (
              <button 
                key={c.id} 
                onClick={() => setSelectedUser(c)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 relative
                  ${isSelected 
                    ? 'bg-slate-800 shadow-sm border border-slate-700/50' 
                    : 'hover:bg-slate-800/40 border border-transparent'}
                `}
              >
                <div className="relative shrink-0">
                  <div className={`p-0.5 rounded-full ${c.unread ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' : 'bg-transparent'}`}>
                     <div className="p-0.5 bg-slate-900 rounded-full">
                        <img src={c.avatar} className="w-14 h-14 rounded-full object-cover" />
                     </div>
                  </div>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-[3px] border-slate-900 bg-green-500" />
                  )}
                </div>
                
                <div className="flex-1 text-left min-w-0">
                   <div className="flex justify-between items-center mb-0.5">
                     <div className={`text-sm font-bold truncate ${c.unread ? 'text-white' : 'text-slate-200'}`}>{c.name}</div>
                   </div>
                   <div className={`text-[12px] truncate flex items-center gap-2 ${c.unread ? 'text-white font-bold' : 'text-slate-500'}`}>
                      {typingUsers.get(c.id) ? (
                        <span className="text-blue-500 animate-pulse italic">Typing...</span>
                      ) : (
                        <span className="truncate">{c.lastMessage || 'Active connection'}</span>
                      )}
                      {c.lastTimestamp && (
                        <span className="text-[10px] opacity-40 shrink-0">• {new Date(c.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                   </div>
                </div>

                {c.unread && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] shrink-0" />
                )}
              </button>
            );
          })}
          
          {conversations.length === 0 && !selectedUser && (
            <div className="py-20 text-center opacity-40">
               <MessageCircle size={40} className="mx-auto mb-4 text-slate-700" />
               <p className="text-xs font-bold uppercase tracking-widest text-slate-500">No signals detected</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className={`
        ${!selectedUser ? 'hidden md:flex' : 'flex'} 
        flex-1 bg-slate-900 border border-slate-800/50 rounded-[2.5rem] shadow-2xl flex-col overflow-hidden relative
      `}>
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl z-20 sticky top-0">
               <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="relative">
                    <img src={selectedUser.avatar} className="w-10 h-10 rounded-full object-cover bg-slate-800 border border-slate-700" />
                    {onlineUsers.has(selectedUser.id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-white tracking-tight">{selectedUser.name}</div>
                    </div>
                    <div className="text-[10px] font-medium text-slate-500">
                      {onlineUsers.has(selectedUser.id) ? 'Active now' : 'Orbiting...'}
                    </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                 <button className="p-2 text-slate-400 hover:text-white transition-all">
                   <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800">
                     <Search size={18} />
                   </div>
                 </button>
                 <button className="p-2 text-slate-400 hover:text-white transition-all">
                   <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800">
                     <MoreVertical size={18} />
                   </div>
                 </button>
               </div>
            </div>

            {/* Virtualized Messages List */}
            <div className="flex-1 bg-slate-950/20 relative">
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
                    <div className="h-10 flex items-center px-10 mb-4">
                      <AnimatePresence>
                        {otherUserTyping && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-1 items-center px-4 py-2 bg-slate-800/80 rounded-2xl rounded-bl-none border border-slate-700/50"
                          >
                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ),
                  Header: () => (
                    <div className="py-20 flex flex-col items-center">
                       <OptimizedImage src={selectedUser.avatar} width={100} className="w-24 h-24 rounded-full mb-4 border-2 border-slate-800" />
                       <h3 className="text-xl font-bold text-white mb-1">{selectedUser.name}</h3>
                       <p className="text-sm text-slate-500 mb-6">@{selectedUser.uniqueId || 'ehh_user'}</p>
                       <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: selectedUser.id }))}
                        className="px-6 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg border border-slate-700 hover:bg-slate-700 transition-all hover:scale-105"
                       >
                         View Profile
                       </button>
                    </div>
                  )
                }}
              />
            </div>

            {/* Input Controls */}
            <div className="px-6 pb-6 pt-2">
               <ChatInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
             <div className="w-24 h-24 rounded-full border-2 border-slate-800 flex items-center justify-center text-slate-800">
                <MessageCircle size={48} />
             </div>
             <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Your Messages</h3>
                <p className="text-sm text-slate-500 px-12">Select a transmission link to begin real-time communication.</p>
             </div>
             <button onClick={fetchConversations} className="mt-4 px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95">
                New Message
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
