import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  Repeat2 
} from "lucide-react";
import { User } from "../types";

interface NotificationPageProps {
  user: User;
  onRead: () => void;
}

export default function NotificationPage({ user, onRead }: NotificationPageProps) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, [user.id]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`/api/notifications/${user.id}`);
      setNotifications(res.data);
    } catch {}
  };

  const markRead = async (id: number) => {
    try {
      await axios.post(`/api/notifications/${id}/read`);
      fetchNotifications();
      onRead();
    } catch {}
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-10">Notifications</h2>
      <div className="space-y-4">
        {notifications.map(n => (
          <div 
            key={n.id} 
            onClick={() => markRead(n.id)}
            className={`bg-slate-800 border p-6 flex items-center gap-6 cursor-pointer group transition-all rounded-[2.5rem] shadow-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] ${n.isRead ? 'opacity-60 grayscale border-slate-700' : 'border-green-500/30 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]'}`}
          >
            <div className="relative">
              <img src={n.senderAvatar} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm" />
              <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white ${n.type === 'LIKE' ? 'bg-red-500' : n.type === 'COMMENT' ? 'bg-green-500' : 'bg-blue-500'} shadow-[0_0_10px_rgba(34,197,94,0.3)]`}>
                {n.type === 'LIKE' ? <Heart size={10} fill="white" /> : n.type === 'COMMENT' ? <MessageCircle size={10} /> : <Repeat2 size={10} />}
              </div>
            </div>
            <div className="flex-1">
               <div className="text-sm font-medium text-slate-300">
                  <span className="font-black text-white">@{n.senderName}</span> {n.content}
               </div>
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Received {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            {!n.isRead && <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />}
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="py-20 text-center opacity-20">
             <Bell size={48} className="mx-auto mb-6 text-slate-500" />
             <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-400">Nothing to see here</p>
          </div>
        )}
      </div>
    </div>
  );
}
