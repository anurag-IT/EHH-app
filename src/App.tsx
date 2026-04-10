import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  LogOut,
  Bell,
  Home,
  Search,
  PlusSquare,
  User as UserIcon,
  Heart,
  Repeat2,
  MessageCircle,
  Send,
  Trash2,
  ShieldAlert,
  Flag,
  X,
  Camera,
  MoreHorizontal,
  MapPin,
  Smile,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  TrendingUp,
  Image as ImageIcon,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Admin from "./pages/Admin";

// --- Types ---
interface User {
  id: number;
  name: string;
  email: string;
  uniqueId: string;
  avatar: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BANNED" | "PERMANENT_BAN";
  banReason?: string;
  banUntil?: string;
}

interface Comment {
  id: number;
  text: string;
  user: User;
  createdAt: string;
}

interface Post {
  id: number;
  userId: number;
  user: User;
  imagePath: string;
  caption: string;
  location?: string;
  sha256: string;
  phash: string;
  parentId: number | null;
  parent?: Post;
  comments?: Comment[];
  createdAt: string;
}

interface Message {
  id: number;
  messageText: string;
  createdAt: string;
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"feed" | "search" | "upload" | "profile" | "auth" | "lostfound" | "admin">("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("social_user");
    if (saved) {
      setUser(JSON.parse(saved));
    } else {
      setView("auth");
    }
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/posts");
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = authMode === "register" ? "/api/users/register" : "/api/users/login";
      const res = await axios.post(endpoint, { name, email });
      setUser(res.data);
      localStorage.setItem("social_user", JSON.stringify(res.data));
      setView("feed");
      toast.success(`Welcome back, ${res.data.name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Authentication failed. Check your link.");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("social_user");
    setView("auth");
    toast.info("Session terminated.");
  };

  const refreshHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if(view === "feed") {
      fetchPosts();
    } else {
      setView("feed");
    }
  };

  if (view === "auth") {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#fdfcfb]">
        {/* Subtle Light Accents */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-slate-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-slate-200/50 rounded-full blur-[120px]" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="premium-card p-10 backdrop-blur-3xl shadow-2xl border border-slate-200">
            <div className="flex flex-col items-center mb-12">
              <motion.div 
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="mb-6 p-4 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm"
              >
                <img src="/logo.png" alt="EHH Logo" className="h-16 w-auto transition-opacity" />
              </motion.div>
              <h1 className="text-4xl font-black text-slate-900 mb-1 tracking-tighter uppercase">Identity Access</h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] text-center">Protocol EHH-Mainframe</p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-6">
              {authMode === "register" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 ml-4 tracking-widest">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-7 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-400 outline-none transition-all duration-300"
                    placeholder="Enter full name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-4 tracking-widest">Verification ID (Email)</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-7 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-400 outline-none transition-all duration-300"
                  placeholder="name@organization.com"
                />
              </div>
              
              <button className="group w-full relative h-16 mt-4 overflow-hidden rounded-2xl bg-slate-900 font-black text-white transition-all hover:bg-slate-800 active:scale-95 shadow-lg shadow-slate-200">
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {authMode === "login" ? "AUTHORIZE ENTRY" : "INITIALIZE IDENTITY"}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </form>
            
            <div className="mt-12 flex flex-col items-center">
              <button 
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                className="text-sm text-slate-400 hover:text-slate-900 font-bold transition-all"
              >
                {authMode === "login" ? "Request new access credentials" : "Return to secure authorization"}
              </button>
              <div className="mt-8 flex items-center gap-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                <span className="h-[1px] w-8 bg-slate-100" />
                <span>Encrypted Connection Active</span>
                <span className="h-[1px] w-8 bg-slate-100" />
              </div>
            </div>
            </div>
          </motion.div>
        </div>
      );
    }

  return (
    <div className={`min-h-screen bg-[#fdfcfb] text-slate-900 selection:bg-slate-900 selection:text-white ${view === "admin" ? "" : "pb-24 md:pb-0 md:pt-20"}`}>
      {/* Header (Universal) */}
      {view !== "admin" && (
        <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-100 z-[100] flex items-center shadow-sm">
          <div className="w-full max-w-[1920px] mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={refreshHome}>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 transition-all">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
              </div>
            </div>
            
            {/* Nav Group */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <NavButton active={view === "feed"} onClick={refreshHome} icon={<Home size={20} />} label="Home" />
              <NavButton active={view === "search"} onClick={() => setView("search")} icon={<Search size={20} />} label="Search" />
              <NavButton active={view === "upload"} onClick={() => setView("upload")} icon={<PlusSquare size={20} />} label="Post" />
              <NavButton active={view === "notifications"} onClick={() => setView("notifications")} icon={<Bell size={20} />} label="Notifications" />
              <NavButton active={view === "lostfound"} onClick={() => setView("lostfound")} icon={<Send size={20} />} label="Messages" />
              <NavButton active={view === "profile"} onClick={() => setView("profile")} icon={<UserIcon size={20} />} label="Profile" />
            </div>

            <div className="flex items-center gap-3">
              {user?.role === "ADMIN" && (
                 <button 
                  onClick={() => setView("admin")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${view === 'admin' ? 'bg-red-50 text-white shadow-lg' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'}`}
                >
                  <ShieldAlert size={18} />
                  <span className="hidden lg:block text-sm uppercase font-black tracking-tighter">Admin</span>
                </button>
              )}
              <button onClick={logout} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-slate-100 transition-all group">
                 <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main Layout */}
      <main className={`${view === "admin" ? "w-full" : "w-full max-w-[1920px] mx-auto px-6 py-6"}`}>
        {/* Ban Alert */}
        {user && user.status !== "ACTIVE" && view !== "admin" && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldAlert size={120} className="text-red-500" />
            </div>
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/30">
              <ShieldAlert className="text-red-500" size={32} />
            </div>
            <div className="relative z-10">
              <h3 className="text-red-100 font-black text-xl tracking-tight">Access Restricted</h3>
              <p className="text-red-400/80 text-sm font-medium mt-1">
                Your account is currently suspended for: <span className="text-red-400 font-bold decoration-red-500/50 underline-offset-4">{user.banReason || "Violation of system protocols"}</span>. 
                {user.banUntil ? ` Normal operations resume on ${new Date(user.banUntil).toLocaleDateString()}.` : " This restriction is permanent."}
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {view === "feed" && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Sidebar Left - Profile Glance */}
              <div className="hidden lg:block lg:col-span-3 space-y-6">
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm sticky top-28">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <img src={user?.avatar} className="w-24 h-24 rounded-full border-4 border-slate-50 object-cover shadow-lg" />
                      <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900">{user?.name}</h2>
                    <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mt-1">{user?.uniqueId}</p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full mt-8 border-t border-slate-50 pt-8">
                       <div>
                         <div className="text-lg font-black text-slate-900">{posts.filter(p => p.userId === user?.id).length}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Posts</div>
                       </div>
                       <div>
                         <div className="text-lg font-black text-slate-900">{posts.length}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tracking</div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle - The Feed */}
              <div className="col-span-1 lg:col-span-6 space-y-8 pb-12">
                {loading && posts.length === 0 ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-[600px] w-full bg-white/5 rounded-3xl animate-pulse" />
                  ))
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="p-8 bg-emerald-500/5 rounded-full ring-1 ring-emerald-500/10">
                      <Camera size={48} className="text-emerald-500/40" />
                    </div>
                    <div className="max-w-xs transition-all">
                      <h3 className="text-xl font-bold">The Network is Silent</h3>
                      <p className="text-emerald-400/40 text-sm mt-2 font-medium">Be the first to transmit an image to the EHH global tracking network.</p>
                      <button onClick={() => setView("upload")} className="mt-8 px-8 py-3 bg-emerald-500 text-emerald-950 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all">START BROADCAST</button>
                    </div>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id}>
                      <PostCard post={post} onRepost={() => fetchPosts()} onDelete={() => fetchPosts()} />
                    </div>
                  ))
                )}
              </div>

              {/* Sidebar Right - Trends/Activity */}
              <div className="hidden lg:block lg:col-span-3 space-y-6">
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm sticky top-28">
                  {user?.role === "ADMIN" ? (
                    <>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-500" /> System Monitoring
                      </h3>
                      <div className="space-y-6">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-2xl font-black text-slate-900">{posts.length}</span>
                            <span className="text-[10px] font-bold text-emerald-600">+12%</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Assets</div>
                        </div>
                        
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-2xl font-black text-slate-900">100%</span>
                            <span className="text-[10px] font-bold text-emerald-600">ACTIVE</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Network Uptime</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Smile size={14} className="text-emerald-500" /> Network Insights
                      </h3>
                      <div className="space-y-6">
                        <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] text-white shadow-lg shadow-emerald-100">
                          <h4 className="font-black text-lg leading-tight uppercase tracking-tighter">Verified Protocol</h4>
                          <p className="text-[10px] opacity-80 mt-2 font-bold uppercase tracking-widest">Your connection is fully encrypted and secure.</p>
                        </div>
                        
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-100">
                                 <ImageIcon size={14} className="text-slate-900" />
                              </div>
                              <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Community Hub</div>
                           </div>
                           <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase">Join the global network and share identifiers with precision.</p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="mt-8 pt-8 border-t border-slate-50">
                    <p className="text-[10px] text-slate-300 leading-relaxed font-bold uppercase">System: v2.4 Professional<br/>Provider: EHH Secure</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "search" && <SearchPage />}
          {view === "upload" && <UploadPage onComplete={() => { fetchPosts(); setView("feed"); }} userId={user?.id || 0} />}
          {view === "profile" && user && <ProfilePage user={user} posts={posts.filter(p => p.userId === user.id)} onLogout={logout} />}
          {view === "notifications" && <NotificationPage user={user!} />}
          {view === "lostfound" && <LostFoundPage />}
          {view === "admin" && <Admin onComplete={() => { fetchPosts(); setView("feed"); }} />}
        </AnimatePresence>
      </main>

      {/* Mobile Nav */}
      {view !== "admin" && (
        <nav className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/90 backdrop-blur-3xl border border-slate-200 flex items-center justify-around z-[100] rounded-[2.5rem] shadow-xl">
          <MobileNavButton active={view === "feed"} onClick={refreshHome} icon={<Home size={24} />} />
          <MobileNavButton active={view === "search"} onClick={() => setView("search")} icon={<Search size={24} />} />
          <div className="relative -top-10">
            <button onClick={() => setView("upload")} className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl active:scale-90 transition-all">
              <PlusSquare size={28} />
            </button>
          </div>
          <MobileNavButton active={view === "notifications"} onClick={() => setView("notifications")} icon={<Bell size={24} />} />
          <MobileNavButton active={view === "lostfound"} onClick={() => setView("lostfound")} icon={<Send size={24} />} />
          <MobileNavButton active={view === "profile"} onClick={() => setView("profile")} icon={<UserIcon size={24} />} />
        </nav>
      )}

      <ToastContainer 
        theme="light" 
        position="bottom-right"
        aria-label="System Notifications"
        toastClassName="!bg-white !border !border-slate-100 !rounded-2xl !shadow-2xl"
        progressClassName="!bg-slate-900"
      />
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all ${active ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"}`}
    >
      {active && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-slate-900 rounded-xl" />}
      <span className={`relative z-10 transition-transform group-hover:scale-110 ${active ? "scale-110" : "opacity-60"}`}>{icon}</span>
      <span className="relative z-10 text-sm font-black uppercase tracking-tighter hidden lg:block">{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-full transition-all ${active ? "text-slate-900 bg-slate-100" : "text-slate-400"}`}>
      {icon}
    </button>
  );
}

function PostCard({ post, onRepost, onDelete }: { post: Post, onRepost: () => void | Promise<void>, onDelete: () => void | Promise<void> }) {
  const [showChain, setShowChain] = useState(false);
  const [chain, setChain] = useState<Post[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postComments, setPostComments] = useState<Comment[]>(post.comments || []);
  const [isLiking, setIsLiking] = useState(false);

  const handleReport = async () => {
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    try {
      await axios.post(`/api/posts/${post.id}/report`, { userId: user.id, reason: reportReason });
      setShowReport(false);
      setReportReason("");
    } catch {
      alert("Failed to submit report");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    try {
      const res = await axios.post(`/api/posts/${post.id}/comment`, { text: commentText }, { headers: { 'x-user-id': user.id } });
      setPostComments([...postComments, res.data]);
      setCommentText("");
    } catch {
      alert("Comment failed");
    }
  };

  const handleLike = async () => {
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    setIsLiking(true);
    try {
      const res = await axios.post(`/api/posts/${post.id}/like`, { userId: user.id });
      setLiked(res.data.liked);
    } catch { }
    setTimeout(() => setIsLiking(false), 1000);
  };

  const handleRepost = async () => {
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    try {
      await axios.post("/api/posts", {
        userId: user.id,
        caption: `Reposted identifier transmission from @${post.user.name}`,
        parentId: post.id
      });
      onRepost();
    } catch (err) {
      alert("Repost failed");
    }
  };

  const handleDeleteRelated = async () => {
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    if (user.role !== "ADMIN") return;
    if (!confirm("PURGE PROTOCOL: Are you sure you want to delete this asset and all similar identified versions?")) return;
    try {
      await axios.delete(`/api/posts/${post.id}/related`, { headers: { "x-user-id": user.id } });
      onDelete();
    } catch (err) {
      alert("Global purge failed");
    }
  };

  const handleDeleteSingle = async () => {
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    if (!confirm("TERMINATE ASSET: Are you sure you want to delete this transmission?")) return;
    try {
      await axios.delete(`/api/posts/${post.id}`, { headers: { "x-user-id": user.id } });
      onDelete();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const fetchChain = async () => {
    try {
      const res = await axios.get(`/api/posts/${post.id}/chain`);
      setChain(res.data);
      setShowChain(true);
    } catch (err) {
      console.error("Tracking chain fetch failed", err);
    }
  };

  const currentUser = JSON.parse(localStorage.getItem("social_user") || "{}");
  const isBanned = currentUser.status !== "ACTIVE";


  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group/card"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={post.user.avatar || ""} className="w-12 h-12 rounded-[1.25rem] object-cover border-2 border-slate-50" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
              {post.user.name}
              <CheckCircle2 size={14} className="text-emerald-500" />
            </div>
            {post.location && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <MapPin size={10} className="text-slate-400" />
                {post.location}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.role === "ADMIN" && (
            <>
              <a 
                href={`/uploads/${post.imagePath}`} 
                download={`EHH_ASSET_${post.id}.jpg`}
                className="p-2.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" 
                title="Download Asset"
              >
                <PlusSquare size={18} className="rotate-180" />
              </a>
              <button onClick={handleDeleteRelated} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Purge Global Chain">
                <ShieldAlert size={18} />
              </button>
            </>
          )}
          {(currentUser.id === post.userId || currentUser.role === "ADMIN") && (
            <button onClick={handleDeleteSingle} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Terminate Asset">
              <Trash2 size={18} />
            </button>
          )}
          <button className="p-2.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Media Block */}
      <div 
        className="aspect-[4/5] bg-slate-100 relative group/media cursor-pointer overflow-hidden"
        onDoubleClick={!isBanned ? handleLike : undefined}
      >
        <img 
          src={`/uploads/${post.imagePath}`} 
          className="w-full h-full object-cover transition-transform duration-[2.5s] group-hover/media:scale-105" 
          referrerPolicy="no-referrer" 
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity" />
        
        <AnimatePresence>
          {isLiking && (
            <motion.div 
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: 1.5, opacity: 1 }}
               exit={{ scale: 2, opacity: 0 }}
               className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart size={120} fill="#10b981" stroke="white" strokeWidth={2} className="drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactions */}
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-1">
            <motion.button 
              whileHover={!isBanned ? { scale: 1.05 } : {}} 
              whileTap={!isBanned ? { scale: 0.95 } : {}}
              onClick={handleLike} 
              disabled={isBanned}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl transition-all ${liked ? "bg-red-50 text-red-500" : "text-slate-400 hover:text-slate-900 hover:bg-white"} ${isBanned ? "opacity-30" : ""}`}
            >
              <Heart size={20} fill={liked ? "currentColor" : "none"} />
              <span className="text-xs font-black uppercase tracking-widest">Like</span>
            </motion.button>
            
            <motion.button 
              whileHover={!isBanned ? { scale: 1.05 } : {}} 
              whileTap={!isBanned ? { scale: 0.95 } : {}} 
              onClick={() => setShowComments(true)} 
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-white transition-all ${isBanned ? "opacity-30" : ""}`}
              disabled={isBanned}
            >
              <MessageCircle size={20} />
              <span className="text-xs font-black uppercase tracking-widest">{postComments.length}</span>
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            <motion.button 
              whileHover={!isBanned ? { scale: 1.05 } : {}} 
              whileTap={!isBanned ? { scale: 0.95 } : {}} 
              onClick={handleRepost} 
              className={`p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-100 shadow-sm transition-all ${isBanned ? "opacity-30" : ""}`}
              disabled={isBanned}
              title="Repost"
            >
              <Repeat2 size={20} />
            </motion.button>

            <motion.button 
              whileHover={!isBanned ? { scale: 1.05 } : {}} 
              whileTap={!isBanned ? { scale: 0.95 } : {}} 
              onClick={() => setShowReport(true)} 
              className={`p-3 bg-white text-slate-400 hover:text-red-500 rounded-2xl border border-slate-100 shadow-sm transition-all ${isBanned ? "opacity-30" : ""}`}
              disabled={isBanned}
              title="Report"
            >
              <Flag size={20} />
            </motion.button>

            {currentUser.role === "ADMIN" && (
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                onClick={fetchChain} 
                className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200"
                title="Trace Analysis"
              >
                <ShieldAlert size={20} />
              </motion.button>
            )}
          </div>
        </div>

        <div className="space-y-4 px-2">
          <div className="flex gap-3">
             <span className="font-black text-slate-900 uppercase tracking-tighter text-sm">@{post.user.name}</span>
             <p className="text-sm text-slate-600 leading-relaxed font-medium">{post.caption}</p>
          </div>

          {post.parent && (
            <div className="bg-slate-50 p-5 rounded-[2.25rem] border border-slate-100 space-y-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Repeat2 size={12} className="text-emerald-500" /> Root Signal: @{post.parent.user.name}
              </div>
              <p className="italic text-slate-500 text-sm font-medium leading-relaxed">"{post.parent.caption}"</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
            <span>{new Date(post.createdAt).toLocaleString()}</span>
            {postComments.length > 0 && (
              <button 
                onClick={() => setShowComments(true)} 
                className="text-slate-900 hover:opacity-70 transition-opacity"
                >View Archives</button>
            )}
          </div>
        </div>
      </div>

      {/* Chain Modal (Trace) */}
      <AnimatePresence>
        {showChain && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="font-black text-2xl text-slate-900 tracking-tighter flex items-center gap-3">
                    <ShieldAlert className="text-emerald-500" />
                    Identity Intelligence
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Algorithmic forensic trace distribution</p>
                </div>
                <button onClick={() => setShowChain(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all"><X size={24} className="text-slate-900" /></button>
              </div>
              <div className="overflow-y-auto p-10 space-y-6 bg-slate-50/30">
                {chain.length === 0 ? (
                  <div className="text-center py-20 text-slate-300">No cross-platform matches detected in index.</div>
                ) : (
                  chain.map((p) => (
                    <div key={p.id} className="flex items-center gap-6 p-5 rounded-[2rem] bg-white border border-slate-100 group/trace shadow-sm">
                      <div className="relative shrink-0">
                        <img src={`/uploads/${p.imagePath}`} className="w-20 h-20 rounded-2xl object-cover border border-slate-100 group-hover/trace:scale-105 transition-transform" />
                        {p.id === post.id && <div className="absolute -top-3 -right-3 px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full ring-4 ring-white">SOURCE</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="font-extrabold text-slate-900 text-base truncate flex items-center gap-2">
                           {p.user.name}
                           <CheckCircle2 size={12} className="text-emerald-500" />
                         </div>
                         <div className="text-sm text-slate-400 font-medium truncate mt-1">SHA256: {p.sha256.substring(0, 16)}...</div>
                         <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">{p.id === post.id ? "PRIMARY ASSET" : "CLONED IDENTIFIER"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {currentUser.role === "ADMIN" && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                            <Trash2 size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Modal (Records) */}
      <AnimatePresence>
        {showComments && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="font-black text-2xl text-slate-900 tracking-tighter">Engagement Logs</h3>
                <button onClick={() => setShowComments(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100"><X size={24} className="text-slate-900" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50/30">
                {postComments.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 opacity-40"><MessageCircle size={32} className="text-slate-900" /></div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm italic">No records for this identifier.</p>
                  </div>
                ) : (
                  postComments.map((c) => (
                    <div key={c.id} className="flex gap-5 group/comment">
                      <img src={c.user.avatar} className="w-10 h-10 rounded-2xl border border-slate-100" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="font-black text-slate-900 text-sm">{c.user.name}</span>
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium bg-white p-4 rounded-[1.25rem] border border-slate-100 shadow-sm group-hover/comment:border-slate-300 transition-colors">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-10 border-t border-slate-100 bg-white">
                <form onSubmit={handleComment} className="relative">
                  <input 
                    type="text" 
                    disabled={isBanned}
                    placeholder={isBanned ? "Action restricted" : "Enter log entry..."}
                    className={`w-full pl-7 pr-24 py-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-400 outline-none transition-all ${isBanned ? "opacity-30" : ""}`}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={isBanned || !commentText.trim()} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-6 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-0 transition-all shadow-lg"
                  >
                    POST
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 border border-slate-200 shadow-2xl">
              <h3 className="font-black text-2xl mb-2 text-red-600 tracking-tighter flex items-center gap-3"><Flag /> Flag Content</h3>
              <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-8 leading-relaxed">System monitoring suggests a breach. Select reason below.</p>
              <div className="space-y-3">
                {["Inappropriate Context", "Spam / Multi-Post", "Synthetic / AI Generated", "Harmful Narrative", "Other Breach"].map(r => (
                  <button key={r} onClick={() => setReportReason(r)} className={`w-full p-4 rounded-2xl border text-left font-black transition-all ${reportReason === r ? 'bg-red-50 border-red-500 text-red-600 shadow-sm' : 'border-slate-100 text-slate-400 bg-slate-50 hover:bg-white hover:border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                       <span className="text-xs uppercase tracking-widest">{r}</span>
                       {reportReason === r && <AlertCircle size={14} />}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                 <button onClick={() => setShowReport(false)} className="flex-1 py-4 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100">CANCEL</button>
                 <button onClick={handleReport} disabled={!reportReason} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-30 hover:bg-red-500 shadow-lg shadow-red-200">FLAG ASSET</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function UploadPage({ onComplete, userId }: { onComplete: () => void, userId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const emojis = ["😊", "🔥", "❤️", "✨", "🙌", "📍", "📷", "🌟", "☘️", "🌈", "🦋", "🍃"];
  const isBanned = JSON.parse(localStorage.getItem("social_user") || "{}").status !== "ACTIVE";

  const handleUpload = async () => {
    if (!file || isBanned) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("userId", userId.toString());
    formData.append("caption", caption);
    formData.append("location", location);

    try {
      await axios.post("/api/posts", formData, { headers: { 'x-user-id': userId } });
      onComplete();
    } catch (err) {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto py-12">
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl transition-all overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Input Intelligence</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 italic">Authorized Asset Indexing System</p>
          </div>
          <button 
            disabled={!file || loading || isBanned}
            onClick={handleUpload}
            className="group relative px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-slate-800 disabled:opacity-20 transition-all"
          >
            <span className="flex items-center gap-3">
              {loading ? "DATA INDEXING..." : "COMMIT TO NETWORK"}
              <TrendingUp size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
        
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Image Selection Area */}
          <div 
            className="flex-1 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all overflow-hidden relative border-r border-slate-100 group/drop"
            onClick={() => document.getElementById("post-file")?.click()}
          >
            {preview ? (
              <img src={preview} className="w-full h-full object-cover group-hover/drop:scale-105 transition-transform duration-[4s]" />
            ) : (
              <div className="text-center p-12 transition-all">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-8 group-hover/drop:scale-110 group-hover/drop:shadow-lg transition-all">
                   <PlusSquare size={48} className="text-slate-200 group-hover/drop:text-slate-900 transition-colors" />
                </div>
                <h3 className="text-slate-900 font-black text-2xl tracking-tight mb-2 uppercase">CHOOSE SOURCE</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-[240px] mx-auto">Upload identifiers for global network cross-referencing</p>
              </div>
            )}
            <input id="post-file" type="file" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
            }} />
          </div>

          {/* Details Area */}
          <div className="w-full lg:w-[400px] p-12 space-y-10 bg-white flex flex-col">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] pl-2">Descriptive Logs</label>
              <div className="relative">
                <textarea 
                  placeholder="Analyze and describe transmissible content..." 
                  className="w-full p-6 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300 outline-none resize-none h-48 text-sm font-medium transition-all"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
                <button 
                  onClick={() => setShowEmojis(!showEmojis)}
                  className="absolute bottom-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <Smile size={24} />
                </button>
              </div>

              <AnimatePresence>
                {showEmojis && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2.5 p-4 bg-white rounded-3xl border border-slate-100 shadow-xl">
                    {emojis.map(e => (
                      <button key={e} onClick={() => { setCaption(caption + e); setShowEmojis(false); }} className="text-xl hover:scale-125 transition-transform">{e}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] pl-2">Coordinate Tag</label>
              <div className="relative group/input">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-slate-900 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Set tracking position..." 
                  className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300 outline-none text-sm transition-all"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 flex items-end">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert size={16} className="text-slate-900" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Protocol Sync</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase">All content is subject to algorithmic scanning for safety violations. Misuse results in immediate identity restriction.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SearchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzingText, setAnalyzingText] = useState("Initializing System...");

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setLoading(true);
    
    // Fake status updates for wow factor
    const steps = ["Hashing Asset...", "Global Trace Initiated...", "Scanning Buffers...", "Cross-referencing pHash..."];
    steps.forEach((s, i) => setTimeout(() => setAnalyzingText(s), i * 800));

    const formData = new FormData();
    formData.append("image", f);

    try {
      const res = await axios.post("/api/posts/search", formData);
      setResults(res.data);
    } catch (err) {
      alert("System scan failed");
    } finally {
      setTimeout(() => setLoading(false), steps.length * 800);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto py-20">
      <div className="text-center space-y-8 max-w-2xl mx-auto mb-20">
        <div className="inline-block p-4 bg-slate-50 rounded-full border border-slate-100 mb-4 shadow-sm">
           <Search size={48} className="text-slate-900" />
        </div>
        <h2 className="text-6xl font-black tracking-tighter text-slate-900 uppercase">Visual Analysis</h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">Cross-network identity detection algorithms powered by algorithmic fingerprinting.</p>
        
        <div className="pt-8">
          <label className="relative group cursor-pointer inline-block overflow-hidden rounded-[2.5rem] bg-slate-900 px-12 py-6 shadow-xl">
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative z-10 flex items-center gap-4 text-white font-black uppercase text-sm tracking-[0.2em]">
              <ImageIcon size={24} />
              {loading ? analyzingText : "SCAN SOURCE IDENTIFIER"}
              <input type="file" className="hidden" onChange={handleSearch} disabled={loading} />
            </div>
          </label>
        </div>
      </div>

      <AnimatePresence>
        {results.length > 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {results.map((post) => (
              <div key={post.id} className="group/res bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer">
                <div className="aspect-square relative overflow-hidden bg-slate-50">
                   <img src={`/uploads/${post.imagePath}`} className="w-full h-full object-cover group-hover/res:scale-105 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover/res:opacity-100 transition-opacity" />
                   <div className="absolute bottom-6 left-6 right-6 translate-y-4 group-hover/res:translate-y-0 opacity-0 group-hover/res:opacity-100 transition-all">
                      <div className="flex items-center gap-3">
                        <img src={post.user.avatar} className="w-8 h-8 rounded-full ring-2 ring-emerald-500" />
                        <div className="font-black text-white text-xs tracking-widest">@{post.user.name}</div>
                      </div>
                   </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <CheckCircle2 size={12} /> MATCH DETECTED
                    </div>
                    <div className="text-[10px] text-slate-300 font-black">99% PROBABILITY</div>
                  </div>
                  <p className="text-sm text-slate-400 font-medium truncate italic">"{post.caption}"</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-8">
           <div className="w-32 h-32 relative">
             <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
             <div className="absolute inset-0 border-t-4 border-slate-900 rounded-full animate-spin" />
             <div className="absolute inset-0 flex items-center justify-center">
                <ShieldAlert size={32} className="text-slate-900 animate-pulse" />
             </div>
           </div>
           <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">{analyzingText}</p>
        </div>
      )}
    </motion.div>
  );
}

function ProfilePage({ user, posts, onLogout }: { user: User, posts: Post[], onLogout: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [viewState, setViewState] = useState<"posts" | "messages">("posts");

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/messages/${user.id}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Transmission records fetch failed", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 space-y-16">
      {/* Profile Info */}
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="relative">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            className="w-40 h-40 rounded-[3rem] border-4 border-slate-50 p-2 shadow-xl relative overflow-hidden"
          >
             <img src={user.avatar} className="w-full h-full rounded-[2.5rem] object-cover" />
          </motion.div>
          <div className="absolute -bottom-4 -right-4 bg-slate-900 text-white p-3 rounded-[1.25rem] border-4 border-white shadow-2xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">{user.name}</h2>
          <div className="inline-block bg-slate-50 border border-slate-100 px-6 py-2 rounded-2xl text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">
             {user.uniqueId}
          </div>
        </div>

        <div className="flex gap-16 pt-4">
          <div className="text-center group cursor-pointer" onClick={() => setViewState("posts")}>
            <div className={`text-4xl font-black transition-all ${viewState === 'posts' ? 'text-slate-900' : 'text-slate-200 group-hover:text-slate-400'}`}>{posts.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-2">Posts</div>
          </div>
          <div className="text-center group cursor-pointer" onClick={() => setViewState("messages")}>
            <div className={`text-4xl font-black transition-all ${viewState === 'messages' ? 'text-slate-900' : 'text-slate-200 group-hover:text-slate-400'}`}>{messages.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-2">Signals</div>
          </div>
        </div>
      </div>

      {/* Profile Feed Toggle */}
      <div className="border-t border-slate-50 pt-12">
        <div className="flex justify-center gap-4 mb-12">
           <button onClick={() => setViewState("posts")} className={`px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all border ${viewState === 'posts' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}>OVERVIEW</button>
           <button onClick={() => setViewState("messages")} className={`px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all border ${viewState === 'messages' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}>ACTIVITY LOGS</button>
        </div>

        <AnimatePresence mode="wait">
          {viewState === "posts" && (
            <motion.div key="p-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map((post) => (
                <div key={post.id} className="aspect-square bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden relative group/post cursor-pointer shadow-sm">
                  <img src={`/uploads/${post.imagePath}`} className="w-full h-full object-cover transition-transform duration-500 group-hover/post:scale-105" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/post:opacity-100 transition-all flex flex-col items-center justify-center p-6 text-center">
                    <Heart size={24} fill="white" className="text-white mb-2 scale-50 group-hover/post:scale-100 transition-transform duration-500" />
                    <p className="text-[10px] font-black text-white uppercase tracking-widest truncate w-full">{post.caption}</p>
                  </div>
                </div>
              ))}
              {posts.length === 0 && <div className="col-span-full py-20 text-center text-slate-200 italic text-sm font-black uppercase tracking-[0.4em]">Empty Index</div>}
            </motion.div>
          )}

          {viewState === "messages" && (
            <motion.div key="m-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 group/msg hover:border-slate-300 transition-all shadow-sm">
                  <div className="flex items-center gap-3 mb-4 opacity-40 group-hover/msg:opacity-100 transition-opacity">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VALIDATED ASSET SIGNAL</span>
                  </div>
                  <p className="text-base text-slate-800 leading-relaxed font-bold tracking-tight">"{msg.messageText}"</p>
                  <div className="text-[10px] text-slate-300 mt-6 font-black uppercase tracking-[0.3em]">
                    Timestamp: {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {messages.length === 0 && <div className="py-20 text-center text-slate-200 italic text-sm font-black uppercase tracking-[0.4em]">No Signals Detected</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-20 border-t border-slate-50 flex flex-col items-center pb-12">
        <button 
          onClick={onLogout} 
          className="group relative flex items-center gap-4 text-red-600 font-black hover:bg-red-600 hover:text-white px-12 py-5 rounded-[2.5rem] transition-all active:scale-95 bg-red-50 border border-red-100"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="uppercase text-xs tracking-[0.2em]">Logout Session</span>
        </button>
        <p className="text-[10px] text-slate-200 mt-8 tracking-[0.5em] uppercase font-black">EHH Global Protocol v2.4-stable</p>
      </div>
    </div>
  );
}

function LostFoundPage() {
  const [uniqueId, setUniqueId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const isBanned = JSON.parse(localStorage.getItem("social_user") || "{}").status !== "ACTIVE";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBanned) return;
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("social_user") || "{}");
      await axios.post("/api/messages/send", { uniqueId, messageText: message }, { headers: { "x-user-id": user.id } });
      setSuccess(true);
      setMessage("");
      setUniqueId("");
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      alert("Address lookup failed. Check identifier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto py-20">
      <div className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden">
        {isBanned && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-50 flex items-center justify-center p-12 text-center">
            <div className="bg-red-50 border border-red-100 p-8 rounded-[3rem] max-w-sm">
               <ShieldAlert size={48} className="text-red-500 mx-auto mb-6" />
               <h3 className="text-xl font-black text-slate-900 mb-2 uppercase">Protocol Restricted</h3>
               <p className="text-red-600/80 text-xs font-bold uppercase tracking-widest leading-relaxed">External messaging channels are suspended for restricted identities.</p>
            </div>
          </div>
        )}
        
        <div className={isBanned ? "opacity-10 pointer-events-none select-none blur-sm" : ""}>
          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-xl">
              <Send size={32} />
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Signal Sync</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Targeted anonymous messaging via network identifiers.</p>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.2em]">Target Identifier</label>
              <input 
                type="text" 
                required 
                placeholder="ID-000000"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value.toUpperCase())}
                className="w-full px-8 py-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300 outline-none font-mono tracking-[0.4em] transition-all text-lg shadow-sm"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.2em]">Message Payload</label>
              <textarea 
                required 
                placeholder="Enter transmission content..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300 outline-none h-48 resize-none font-medium leading-relaxed transition-all shadow-sm"
              />
            </div>
            
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                   <CheckCircle2 size={18} />
                   <span className="text-xs font-black uppercase tracking-widest">Signal delivered successfully.</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button className="group w-full relative overflow-hidden bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-xl">
              <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <div className="relative z-10 flex items-center justify-center gap-4">
                {loading ? "DATA BROADCASTING..." : "START TRANSMISSION"}
                {!loading && <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </div>
            </button>
            
            <p className="text-center text-[10px] text-slate-200 font-black uppercase tracking-[0.4em] pt-4">EHH Exchange Protocol v2.4-stable</p>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

interface AppNotification {
  id: number;
  userId: number;
  senderName: string;
  senderAvatar: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

function NotificationPage({ user }: { user: User }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`/api/notifications/${user.id}`);
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await axios.post(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {}
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto py-12">
      <div className="flex items-center justify-between mb-12 px-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Notifications</h2>
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
           <Bell size={24} className="text-slate-900" />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
             <div key={i} className="h-24 w-full bg-slate-50 rounded-3xl animate-pulse" />
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-[3rem]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell size={32} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">Silence in the Network</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">New activity will appear here.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => markAsRead(n.id)}
              className={`flex items-center gap-6 p-6 rounded-[2.5rem] border transition-all cursor-pointer ${n.isRead ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-xl shadow-slate-100 ring-2 ring-emerald-500/10'}`}
            >
              <div className="relative shrink-0">
                <img src={n.senderAvatar} className="w-14 h-14 rounded-2xl object-cover border border-slate-100" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center">
                   {n.type === "LIKE" ? <Heart size={8} fill="white" className="text-white" /> : <MessageCircle size={8} fill="white" className="text-white" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm text-slate-950 font-medium leading-relaxed">
                   <span className="font-black uppercase tracking-tighter">@{n.senderName}</span> {n.content}
                 </p>
                 <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1 block">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
              {!n.isRead && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

