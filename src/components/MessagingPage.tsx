import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Send, 
  MessageCircle, 
  X 
} from "lucide-react";
import { User, Message } from "../types";

interface MessagingPageProps {
  currentUser: User;
}

export default function MessagingPage({ currentUser }: MessagingPageProps) {
  const [conversations, setConversations] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchConversations();
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedUser) {
      fetchChat(selectedUser.id);
      const interval = setInterval(() => fetchChat(selectedUser.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser, currentUser.id]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`/api/messages/conversations/${currentUser.id}`);
      setConversations(res.data);
    } catch {}
  };

  const fetchChat = async (targetId: number) => {
    try {
      const res = await axios.get(`/api/messages/chat/${currentUser.id}/${targetId}`);
      setMessages(res.data);
    } catch {}
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newMessage.trim()) return;
    try {
      await axios.post("/api/messages/send-v2", {
        receiverId: selectedUser.id,
        content: newMessage
      }, { headers: { 'x-user-id': currentUser.id } });
      setNewMessage("");
      fetchChat(selectedUser.id);
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-160px)] flex gap-8 py-4">
      {/* Conversations List */}
      <div className="w-80 bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col p-6 overflow-hidden">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-2">Index</h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 chat-scrollbar">
          {conversations.map(c => (
            <button 
              key={c.id} 
              onClick={() => setSelectedUser(c)}
              className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${selectedUser?.id === c.id ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 border border-transparent'}`}
            >
              <img src={c.avatar} className="w-10 h-10 rounded-2xl border-2 border-white object-cover" />
              <div className="text-left">
                 <div className="text-xs font-black uppercase tracking-tighter truncate w-32">{c.name}</div>
                 <div className={`text-[8px] font-bold uppercase tracking-widest ${selectedUser?.id === c.id ? 'text-white/60' : 'text-slate-300'}`}>Connected</div>
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="py-20 text-center opacity-20">
               <Send size={32} className="mx-auto mb-4" />
               <p className="text-[10px] font-black uppercase tracking-[0.2em]">No index records</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white border border-slate-100 rounded-[3rem] shadow-sm flex flex-col overflow-hidden relative">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <img src={selectedUser.avatar} className="w-10 h-10 rounded-2xl object-cover" />
                  <div>
                    <div className="text-sm font-black text-slate-900 uppercase tracking-tighter">{selectedUser.name}</div>
                    <div className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Active Link</div>
                  </div>
               </div>
               <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-10 space-y-6 chat-scrollbar bg-slate-50/20">
               {messages.map(m => (
                 <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-5 rounded-[2rem] text-sm font-medium shadow-sm border ${m.senderId === currentUser.id ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-100'}`}>
                       {m.content}
                    </div>
                 </div>
               ))}
            </div>

            {/* Input */}
            <div className="p-8 bg-white border-t border-slate-100">
               <form onSubmit={sendMessage} className="relative">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="w-full pl-6 pr-16 py-5 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-medium focus:bg-white focus:border-slate-300 transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-4 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all">
                     <Send size={18} />
                  </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 opacity-20">
             <div className="w-32 h-32 bg-slate-50 rounded-[3rem] border border-slate-100 flex items-center justify-center">
                <MessageCircle size={64} className="text-slate-900" />
             </div>
             <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Transmissions</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Select identity for signal transfer</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
