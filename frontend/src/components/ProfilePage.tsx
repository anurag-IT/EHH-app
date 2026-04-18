import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { toast } from "react-toastify";
import { 
  Heart as HeartIcon, 
  MessageCircle as MessageIcon,
  Image as ImageIcon,
  CheckCircle2 
} from "lucide-react";
import { motion } from "motion/react";
import { User, Post } from "../types";
import OptimizedImage from "./common/OptimizedImage";
import { useSocket } from "../context/SocketContext";

interface ProfilePageProps {
  userId?: number;
  user?: User;
  isOwnProfile: boolean;
  onLogout?: () => void;
  currentUserId?: number;
}

export default function ProfilePage({ userId, user: initialUser, isOwnProfile, onLogout, currentUserId }: ProfilePageProps) {
  const [profileUser, setProfileUser] = useState<User | null>(initialUser || null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  
  const { socket } = useSocket();

  useEffect(() => {
    fetchProfile();
  }, [userId, initialUser]);

  useEffect(() => {
    if (socket) {
      const handleNotify = (data: any) => {
        if (data.type === "FOLLOW" || data.type === "FOLLOW_UPDATE") {
          // Refresh profile data to get new counts
          fetchProfile(false);
        }
      };
      socket.on("notification", handleNotify);
      return () => {
        socket.off("notification", handleNotify);
      };
    }
  }, [socket, userId, initialUser]);

  const fetchProfile = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const id = userId || initialUser?.id;
      if (!id) return;
      const res = await api.get(`/api/users/${id}/profile`);
      setProfileUser(res.data);
      setPosts(res.data.posts);
      setFollowing(res.data.isFollowing);
    } catch (err) {
      if (showLoading) toast.error("Failed to load profile");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profileUser || isOwnProfile) return;
    try {
      const res = await api.post(`/api/users/${profileUser.id}/follow`, {});
      setFollowing(res.data.following);
      // Update local follower count for instant feedback
      setProfileUser(prev => {
        if (!prev) return null;
        const newCount = res.data.following 
          ? (prev._count?.followers || 0) + 1 
          : Math.max(0, (prev._count?.followers || 0) - 1);
        return {
          ...prev,
          _count: {
            ...prev._count!,
            followers: newCount
          }
        };
      });
    } catch (err) {
      toast.error("Signal broadcast failed");
    }
  };

  if (loading && !profileUser) return <div className="py-20 text-center animate-pulse text-emerald-500 font-black uppercase tracking-widest">SYNCING PROFILE...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Gen-Z Modern Header */}
      <div className="gen-z-card p-12 overflow-hidden relative border border-slate-700/50 bg-slate-800 rounded-[3rem] shadow-[0_0_50px_rgba(34,197,94,0.1)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="relative">
            <motion.div 
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              className="w-48 h-48 rounded-[3rem] border-8 border-slate-900 shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden bg-slate-800"
            >
              <OptimizedImage 
                src={profileUser?.avatar || ""} 
                width={400} 
                className="w-full h-full" 
              />
            </motion.div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center border-4 border-slate-800 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
               <CheckCircle2 className="text-slate-900" size={24} />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-6">
            <div className="space-y-1">
              <h2 className="text-6xl font-black text-white tracking-tighter uppercase leading-none">{profileUser?.name}</h2>
              <p className="text-green-500 font-bold uppercase tracking-[0.4em] text-xs pb-4">@{profileUser?.uniqueId}</p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-8">
               <div className="space-y-1">
                  <div className="text-2xl font-black text-white">{profileUser?._count?.posts || 0}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Posts</div>
               </div>
               <div className="space-y-1">
                  <div className="text-2xl font-black text-white">{profileUser?._count?.followers || 0}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Followers</div>
               </div>
               <div className="space-y-1">
                  <div className="text-2xl font-black text-white">{profileUser?._count?.following || 0}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Following</div>
               </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
               {isOwnProfile ? (
                 <>
                   <button className="px-8 py-4 bg-green-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]">Edit Profile</button>
                   <button onClick={onLogout} className="px-8 py-4 bg-slate-900 border border-slate-700 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 transition-all">Logout</button>
                 </>
               ) : (
                 <>
                   <button 
                    onClick={handleFollow}
                    className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all ${following ? 'bg-slate-700 text-white shadow-inner' : 'bg-green-500 text-slate-900 shadow-[0_0_20px_rgba(34,197,94,0.3)]'}`}
                   >
                    {following ? 'Following' : 'Follow'}
                   </button>
                   <button className="p-4 bg-slate-900 text-slate-400 border border-slate-700 rounded-2xl hover:text-green-500 hover:border-green-500/50 transition-all">
                      <MessageIcon size={20} />
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-16">
        <div className="flex items-center gap-4 mb-10">
           <div className="h-[2px] flex-1 bg-slate-800" />
           <div className="text-xs font-black text-green-500 uppercase tracking-[0.5em]">Your Assets</div>
           <div className="h-[2px] flex-1 bg-slate-800" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
           {posts.map(post => (
             <motion.div 
               key={post.id} 
               whileHover={{ translateY: -10 }}
               className="aspect-[4/5] rounded-[2.5rem] overflow-hidden relative group/asset cursor-pointer border border-slate-700 shadow-lg bg-slate-800"
             >
                <OptimizedImage 
                  src={post.imageUrl || ""} 
                  width={600} 
                  className="w-full h-full" 
                />
                <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover/asset:opacity-100 transition-all flex flex-col items-center justify-center p-8 text-white scale-95 group-hover/asset:scale-100 backdrop-blur-sm">
                    <HeartIcon size={32} fill="white" className="mb-4" />
                    <div className="flex gap-6 mb-4">
                       <div className="text-center">
                          <div className="text-xl font-black">{post._count?.likes || 0}</div>
                          <div className="text-[8px] font-black uppercase tracking-widest opacity-60">Likes</div>
                       </div>
                       <div className="text-center">
                          <div className="text-xl font-black">{post._count?.comments || 0}</div>
                          <div className="text-[8px] font-black uppercase tracking-widest opacity-60">Comments</div>
                       </div>
                    </div>
                    <p className="text-xs font-bold text-center line-clamp-2 uppercase tracking-tighter">{post.caption}</p>
                </div>
             </motion.div>
           ))}
        </div>
        
        {posts.length === 0 && (
          <div className="py-32 text-center">
             <div className="inline-block p-8 bg-slate-800 rounded-full border border-slate-700 shadow-[0_0_20px_rgba(34,197,94,0.05)] mb-6">
                <ImageIcon size={48} className="text-slate-600" />
             </div>
             <p className="text-slate-500 font-black uppercase tracking-[0.4em]">No signals detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
