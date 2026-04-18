import React, { useState, useEffect, useRef } from "react";
import api, { getOptimizedImageUrl } from "../lib/api";
import { toast } from "react-toastify";
import { 
  Heart as HeartIcon, 
  MessageCircle as MessageIcon,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Camera,
  Settings,
  Lock,
  ChevronRight,
  User as UserIcon
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
  const [followingState, setFollowingState] = useState<{ isFollowing: boolean; status: string | null }>({ isFollowing: false, status: null });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState<{ type: 'followers' | 'following', users: User[] } | null>(null);
  
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editAvatar, setEditAvatar] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { socket } = useSocket();

  useEffect(() => {
    fetchProfile();
  }, [userId, initialUser]);

  const fetchProfile = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const id = userId || initialUser?.id;
      if (!id) return;
      const res = await api.get(`/api/users/${id}/profile`);
      setProfileUser(res.data);
      setPosts(res.data.posts);
      setFollowingState({ isFollowing: res.data.isFollowing, status: res.data.followStatus });
      
      setEditName(res.data.name);
      setEditBio(res.data.bio || "");
      setEditIsPrivate(res.data.isPrivate || false);
    } catch (err) {
      if (showLoading) toast.error("Failed to load profile");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchUserList = async (type: 'followers' | 'following') => {
    if (!profileUser) return;
    try {
      const res = await api.get(`/api/users/${profileUser.id}/${type}`);
      setShowUserListModal({ type, users: res.data });
    } catch (err) {
      toast.error(`Could not decode ${type} signals.`);
    }
  };

  const handleFollow = async () => {
    if (!profileUser || isOwnProfile) return;
    try {
      const res = await api.post(`/api/users/${profileUser.id}/follow`, {});
      setFollowingState({ isFollowing: res.data.following, status: res.data.status });
      // Refresh count on success
      fetchProfile(false);
    } catch (err) {
      toast.error("Handshake failed");
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
    formData.append("isPrivate", editIsPrivate.toString());
    if (editAvatar) formData.append("images", editAvatar);

    try {
      const res = await api.put("/api/users/profile", formData);
      setProfileUser(prev => ({ ...prev!, ...res.data }));
      localStorage.setItem("social_user", JSON.stringify(res.data));
      setShowEditModal(false);
      toast.success("Identity updated on grid.");
      fetchProfile(false);
    } catch (err) {
      toast.error("Update failed: encryption error.");
    } finally {
      setUpdating(false);
    }
  };

  const isBlockedByPrivacy = profileUser?.isPrivate && !followingState.isFollowing && !isOwnProfile;

  if (loading && !profileUser) return (
    <div className="py-32 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-12 mb-16">
        <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
           <div className="p-1.5 bg-slate-900 rounded-full">
              <OptimizedImage 
                src={profileUser?.avatar || ""} 
                width={200} 
                className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-slate-900 shadow-2xl" 
              />
           </div>
        </div>

        <div className="flex-1 space-y-6 text-center md:text-left w-full">
           <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center justify-center md:justify-start gap-2">
                 <h2 className="text-3xl font-black text-white tracking-tight">{profileUser?.name}</h2>
                 {profileUser?.isPrivate && <Lock size={18} className="text-slate-500" />}
              </div>
              <div className="flex gap-2 justify-center md:justify-start">
                 {isOwnProfile ? (
                   <>
                     <button onClick={() => setShowEditModal(true)} className="px-8 py-2.5 bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl border border-slate-700/50 hover:bg-slate-700 transition-all">Edit Profile</button>
                     <button onClick={onLogout} className="p-2.5 bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl border border-slate-700/50 transition-all">
                        <Settings size={20} />
                     </button>
                   </>
                 ) : (
                   <>
                     <button 
                      onClick={handleFollow}
                      className={`px-10 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        followingState.status === 'PENDING' ? 'bg-slate-800 text-slate-500 border border-slate-700' :
                        followingState.isFollowing ? 'bg-slate-800 text-white border border-slate-700' : 
                        'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      }`}
                     >
                       {followingState.status === 'PENDING' ? 'Requested' : followingState.isFollowing ? 'Following' : 'Follow'}
                     </button>
                     <button 
                      onClick={() => !isBlockedByPrivacy && window.dispatchEvent(new CustomEvent('open-chat', { detail: profileUser }))}
                      disabled={isBlockedByPrivacy}
                      className="px-8 py-2.5 bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl border border-slate-700/50 hover:bg-slate-700 transition-all disabled:opacity-30"
                     >
                       Message
                     </button>
                   </>
                 )}
              </div>
           </div>

           <div className="flex justify-around md:justify-start md:gap-12 py-6 border-y border-slate-800/50 md:border-y-0">
              <div className="cursor-default group">
                 <div className="text-xl font-black text-white">{profileUser?._count?.posts || 0}</div>
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-blue-500 transition-colors">Signals</div>
              </div>
              <div className="cursor-pointer group" onClick={() => !isBlockedByPrivacy && fetchUserList('followers')}>
                 <div className="text-xl font-black text-white">{profileUser?._count?.followers || 0}</div>
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-blue-500 transition-colors">Followers</div>
              </div>
              <div className="cursor-pointer group" onClick={() => !isBlockedByPrivacy && fetchUserList('following')}>
                 <div className="text-xl font-black text-white">{profileUser?._count?.following || 0}</div>
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-blue-500 transition-colors">Following</div>
              </div>
           </div>

           <div className="space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">ID: {profileUser?.uniqueId}</div>
              <p className="text-sm text-slate-400 font-medium whitespace-pre-wrap leading-relaxed max-w-lg">{profileUser?.bio || "No description broadcasted."}</p>
           </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="border-t border-slate-800 pt-12">
         {isBlockedByPrivacy ? (
           <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-700">
              <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-600 mb-4 shadow-[0_0_50px_rgba(34,197,94,0.05)]">
                 <Lock size={40} />
              </div>
              <h3 className="text-xl font-black text-white">Private Encryption Enabled</h3>
              <p className="text-sm text-slate-500 px-12 max-w-sm">Synchronize your follow link to view this user's asset signals and post history.</p>
           </div>
         ) : (
           <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-8">
              {posts.map(post => (
                <motion.div 
                  key={post.id} 
                  whileHover={{ scale: 1.02 }}
                  className="aspect-square relative group bg-slate-900 border border-slate-800 rounded-2xl md:rounded-[2.5rem] overflow-hidden cursor-pointer"
                >
                   <OptimizedImage src={post.imageUrl || ""} width={600} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                   <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-sm p-4">
                       <div className="flex gap-8 text-white">
                          <div className="flex items-center gap-2"><HeartIcon size={24} fill="white" /> <span className="font-black">{post._count?.likes || 0}</span></div>
                          <div className="flex items-center gap-2"><MessageIcon size={24} fill="white" /> <span className="font-black">{post._count?.comments || 0}</span></div>
                       </div>
                   </div>
                </motion.div>
              ))}
              {posts.length === 0 && (
                 <div className="col-span-full py-24 text-center opacity-20">
                    <ImageIcon size={64} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.5em]">No Assets Detected</p>
                 </div>
              )}
           </div>
         )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden p-8">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-white tracking-widest uppercase">Grid Refine</h3>
                  <button onClick={() => setShowEditModal(false)}><X className="text-slate-500 hover:text-white" /></button>
               </div>

               <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="flex flex-col items-center space-y-4">
                      <div className="relative group p-1 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                         <OptimizedImage src={previewAvatar || profileUser?.avatar || ""} width={120} className="w-24 h-24 rounded-full border-4 border-slate-900 group-hover:opacity-60 transition-all" />
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white"><Camera size={24} /></div>
                      </div>
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onAvatarChange} />
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Registry Name</label>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white font-bold text-sm focus:border-blue-500/50 outline-none transition-all" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Bio Signal</label>
                        <textarea rows={3} value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white font-bold text-sm focus:border-blue-500/50 outline-none transition-all resize-none" />
                     </div>
                     
                     {/* Privacy Switch */}
                     <div className="flex items-center justify-between bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                        <div className="flex items-center gap-3">
                           <Lock className={`transition-colors ${editIsPrivate ? 'text-blue-500' : 'text-slate-600'}`} size={18} />
                           <div>
                              <div className="text-xs font-black text-white uppercase tracking-wider">Private Encryption</div>
                              <div className="text-[9px] text-slate-500 font-bold">Only followers can see your assets</div>
                           </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setEditIsPrivate(!editIsPrivate)}
                          className={`w-12 h-6 rounded-full relative transition-all duration-300 ${editIsPrivate ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-700'}`}
                        >
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${editIsPrivate ? 'right-1' : 'left-1'}`} />
                        </button>
                     </div>
                  </div>

                  <button disabled={updating} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all">
                    {updating ? 'SYNCING...' : 'CONFIRM IDENTITY'}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User List Modal (Followers/Following) */}
      <AnimatePresence>
        {showUserListModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUserListModal(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                   <h3 className="text-lg font-black text-white uppercase tracking-widest">{showUserListModal.type}</h3>
                   <button onClick={() => setShowUserListModal(null)} className="p-2 text-slate-500 hover:text-white bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                   {showUserListModal.users.map(u => (
                     <div key={u.id} className="flex items-center gap-4 p-3 hover:bg-slate-800/50 rounded-2xl transition-all group cursor-pointer" onClick={() => { setShowUserListModal(null); window.dispatchEvent(new CustomEvent('open-profile', { detail: u.id })) }}>
                        <OptimizedImage src={u.avatar} width={60} className="w-12 h-12 rounded-full border-2 border-slate-800 group-hover:border-blue-500 transition-colors" />
                        <div className="flex-1">
                           <div className="text-sm font-black text-white">{u.name}</div>
                           <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">@{u.uniqueId}</div>
                        </div>
                        <ChevronRight className="text-slate-700 group-hover:text-white transition-all transform group-hover:translate-x-1" size={18} />
                     </div>
                   ))}
                   {showUserListModal.users.length === 0 && (
                      <div className="py-12 text-center text-slate-600">
                         <UserIcon className="mx-auto mb-2 opacity-20" size={32} />
                         <p className="text-[10px] font-black uppercase tracking-widest">Grid link empty</p>
                      </div>
                   )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
