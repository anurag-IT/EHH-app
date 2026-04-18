import React, { useState, useEffect, useRef } from "react";
import api from "../lib/api";
import { toast } from "react-toastify";
import { 
  Heart as HeartIcon, 
  MessageCircle as MessageIcon,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Camera,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { socket } = useSocket();

  useEffect(() => {
    fetchProfile();
  }, [userId, initialUser]);

  useEffect(() => {
    if (socket) {
      const handleNotify = (data: any) => {
        if (data.type === "FOLLOW" || data.type === "FOLLOW_UPDATE") {
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
      
      // Prep edit states
      setEditName(res.data.name);
      setEditBio(res.data.bio || "");
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
      setProfileUser(prev => {
        if (!prev) return null;
        const newCount = res.data.following 
          ? (prev._count?.followers || 0) + 1 
          : Math.max(0, (prev._count?.followers || 0) - 1);
        return { ...prev, _count: { ...prev._count!, followers: newCount } };
      });
    } catch (err) {
      toast.error("Follow action failed");
    }
  };

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditAvatar(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    const formData = new FormData();
    formData.append("name", editName);
    formData.append("bio", editBio);
    if (editAvatar) formData.append("avatar", editAvatar);

    try {
      const res = await api.put("/api/users/profile", formData);
      setProfileUser(res.data);
      // Update local storage if it's the current user
      localStorage.setItem("social_user", JSON.stringify(res.data));
      setShowEditModal(false);
      toast.success("Profile refined");
      fetchProfile(false);
    } catch (err) {
      toast.error("Profile update failed");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !profileUser) return (
    <div className="py-32 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-slate-800 border-t-green-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Syncing Neural Data</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header Section */}
      <div className="space-y-12 mb-16">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Avatar with Story Circle */}
          <div className="relative group p-1.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
             <div className="p-1.5 bg-slate-900 rounded-full">
                <OptimizedImage 
                  src={profileUser?.avatar || ""} 
                  width={200} 
                  className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-slate-900" 
                />
             </div>
             {isOwnProfile && (
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="absolute bottom-2 right-2 p-3 bg-blue-500 text-white rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all border-4 border-slate-900"
                >
                  <Camera size={20} />
                </button>
             )}
          </div>

          <div className="flex-1 space-y-6 text-center md:text-left">
             <div className="flex flex-col md:flex-row md:items-center gap-4">
                <h2 className="text-3xl font-black text-white tracking-tight">{profileUser?.name}</h2>
                <div className="flex gap-2 justify-center md:justify-start">
                   {isOwnProfile ? (
                     <>
                       <button 
                        onClick={() => setShowEditModal(true)}
                        className="px-6 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg border border-slate-700 hover:bg-slate-700 transition-all"
                       >
                         Edit Profile
                       </button>
                       <button onClick={onLogout} className="p-2 bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg border border-slate-700 transition-all">
                          <Settings size={18} />
                       </button>
                     </>
                   ) : (
                     <>
                       <button 
                        onClick={handleFollow}
                        className={`px-8 py-2 rounded-lg font-bold text-xs transition-all ${following ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'}`}
                       >
                         {following ? 'Following' : 'Follow'}
                       </button>
                       <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: profileUser }))}
                        className="px-6 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg border border-slate-700 hover:bg-slate-700 transition-all"
                       >
                         Message
                       </button>
                     </>
                   )}
                </div>
             </div>

             <div className="flex justify-center md:justify-start gap-8 border-y md:border-y-0 border-slate-800 py-6 md:py-0">
                <div className="text-center md:text-left">
                   <span className="font-black text-white">{profileUser?._count?.posts || 0}</span>
                   <span className="text-slate-400 text-xs ml-2 uppercase tracking-widest font-medium">Nodes</span>
                </div>
                <div className="text-center md:text-left">
                   <span className="font-black text-white">{profileUser?._count?.followers || 0}</span>
                   <span className="text-slate-400 text-xs ml-2 uppercase tracking-widest font-medium">Followers</span>
                </div>
                <div className="text-center md:text-left">
                   <span className="font-black text-white">{profileUser?._count?.following || 0}</span>
                   <span className="text-slate-400 text-xs ml-2 uppercase tracking-widest font-medium">Following</span>
                </div>
             </div>

             <div className="space-y-1">
                <div className="text-sm font-bold text-slate-300 uppercase tracking-tighter">@{profileUser?.uniqueId}</div>
                <p className="text-sm text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">{profileUser?.bio || "No profile signal detected in the planetary grid."}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="border-t border-slate-800 pt-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 md:gap-4 lg:gap-8">
           {posts.map(post => (
             <motion.div 
               key={post.id} 
               whileHover={{ translateY: -4 }}
               className="aspect-square relative group cursor-pointer bg-slate-900 overflow-hidden md:rounded-3xl border border-white/5"
             >
                <OptimizedImage 
                  src={post.imageUrl || ""} 
                  width={600} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="flex gap-6 text-white font-black text-lg">
                       <div className="flex items-center gap-2">
                          <HeartIcon size={24} fill="white" />
                          <span>{post._count?.likes || 0}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <MessageIcon size={24} fill="white" />
                          <span>{post._count?.comments || 0}</span>
                       </div>
                    </div>
                </div>
             </motion.div>
           ))}
        </div>
        
        {posts.length === 0 && (
          <div className="py-24 text-center opacity-40">
             <ImageIcon size={64} className="mx-auto mb-6 text-slate-700" />
             <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Grid signal empty</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
               <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white tracking-tight">Refine Profile</h3>
                  <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
               </div>

               <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
                  <div className="flex flex-col items-center space-y-4">
                     <div className="relative group">
                        <OptimizedImage 
                          src={previewAvatar || profileUser?.avatar || ""} 
                          width={140} 
                          className="w-28 h-28 rounded-full border-4 border-slate-800 group-hover:opacity-60 transition-all" 
                        />
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"
                        >
                          <Camera size={24} />
                        </button>
                     </div>
                     <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest cursor-pointer" onClick={() => fileInputRef.current?.click()}>Update Identification Image</span>
                     <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onAvatarChange} />
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">Display Name</label>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-6 py-4 bg-slate-800 border border-slate-700/50 rounded-2xl text-white font-bold text-sm focus:border-blue-500/50 outline-none transition-all"
                          placeholder="Your planetary display name"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">Digital Bio</label>
                        <textarea 
                          rows={3}
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          className="w-full px-6 py-4 bg-slate-800 border border-slate-700/50 rounded-2xl text-white font-bold text-sm focus:border-blue-500/50 outline-none transition-all resize-none"
                          placeholder="Share your signal with the grid..."
                        />
                     </div>
                  </div>

                  <button 
                    disabled={updating}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                  >
                    {updating ? 'SYNCING DATA...' : 'APPLY REFINE'}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
