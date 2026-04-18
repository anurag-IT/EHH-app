import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus,
  Check,
  X,
  Lock,
  MessageSquare
} from "lucide-react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import OptimizedImage from "./common/OptimizedImage";

interface NotificationPageProps {
  user: User;
  onRead: () => void;
}

export default function NotificationPage({ user, onRead }: NotificationPageProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [user.id]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/notifications/${user.id}`);
      setNotifications(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: number) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      onRead();
    } catch {}
  };

  const handleRequest = async (e: React.MouseEvent, requestId: number, action: 'accept' | 'reject', notificationId: number) => {
    e.stopPropagation();
    try {
       await api.post(`/api/users/requests/${requestId}/${action}`);
       // Update notification to show it's handled or just remove from list
       await api.post(`/api/notifications/${notificationId}/read`);
       fetchNotifications();
       onRead();
    } catch (err) {
       console.error("Action failed", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return <Heart size={14} fill="white" />;
      case 'COMMENT': return <MessageCircle size={14} fill="white" />;
      case 'FOLLOW_REQUEST': return <Lock size={14} fill="white" />;
      case 'FOLLOW': return <UserPlus size={14} fill="white" />;
      case 'MESSAGE': return <MessageSquare size={14} fill="white" />;
      default: return <Bell size={14} fill="white" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'LIKE': return 'bg-rose-500';
      case 'COMMENT': return 'bg-emerald-500';
      case 'FOLLOW_REQUEST': return 'bg-amber-500';
      case 'FOLLOW': return 'bg-blue-500';
      case 'MESSAGE': return 'bg-purple-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 pb-32">
      <div className="flex items-center justify-between mb-12">
         <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Transmission Registry</h2>
         <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {notifications.filter(n => !n.isRead).length} Unread
         </div>
      </div>

      <div className="space-y-4">
        {notifications.map((n, idx) => (
          <motion.div 
            key={n.id} 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => markRead(n.id)}
            className={`relative p-5 flex items-center gap-6 cursor-pointer group transition-all rounded-[2rem] border overflow-hidden ${
              n.isRead 
              ? 'bg-slate-900/40 border-slate-800 opacity-60' 
              : 'bg-slate-800 border-slate-700/50 shadow-xl'
            }`}
          >
            <div className="relative shrink-0">
               <OptimizedImage src={n.senderAvatar} width={100} className="w-14 h-14 rounded-2xl border-2 border-slate-700 group-hover:border-blue-500/50 transition-colors" />
               <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-lg text-white shadow-xl ${getIconBg(n.type)}`}>
                  {getIcon(n.type)}
               </div>
            </div>

            <div className="flex-1">
               <div className="text-sm">
                  <span className="font-black text-white hover:underline" onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-profile', { detail: n.senderId })) }}>
                    @{n.senderName}
                  </span>
                  <span className="text-slate-400 ml-1.5 font-medium">{n.content}</span>
               </div>
               <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-700" />
                  <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
            </div>

            {n.type === 'FOLLOW_REQUEST' && !n.isRead && (
               <div className="flex items-center gap-2 relative z-10 shrink-0">
                  <button 
                    onClick={(e) => handleRequest(e, n.requestId, 'accept', n.id)}
                    className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-all active:scale-95"
                  >
                     <Check size={18} />
                  </button>
                  <button 
                    onClick={(e) => handleRequest(e, n.requestId, 'reject', n.id)}
                    className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl shadow-lg transition-all active:scale-95"
                  >
                     <X size={18} />
                  </button>
               </div>
            )}

            {!n.isRead && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]" />}
          </motion.div>
        ))}

        <AnimatePresence>
          {notifications.length === 0 && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
               <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-700">
                  <Bell size={32} />
               </div>
               <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">The grid is silent</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
