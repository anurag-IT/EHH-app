import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "./lib/api";
import { 
  LogOut,
  Bell,
  Home,
  Search,
  PlusSquare,
  User as UserIcon,
  Send,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Admin from "./pages/Admin";
import { User, Post } from "./types";

// --- Modular Components ---
import PostCard from "./components/PostCard";
import UploadPage from "./components/UploadPage";
import SearchPage from "./components/SearchPage";
import ProfilePage from "./components/ProfilePage";
import MessagingPage from "./components/MessagingPage";
import NotificationPage from "./components/NotificationPage";
import LostFoundPage from "./components/LostFoundPage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"feed" | "search" | "upload" | "profile" | "auth" | "lostfound" | "admin" | "userProfile" | "messages">("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  
  // Pagination State
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Infinite Scroll Observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  useEffect(() => {
    const saved = localStorage.getItem("social_user");
    if (saved) {
      setUser(JSON.parse(saved));
    } else {
      setView("auth");
    }
  }, []);

  useEffect(() => {
    if (user || view === "feed") {
      fetchPosts(true);
    }
  }, [user]);

  useEffect(() => {
    const handleOpenProfile = (e: any) => {
      setTargetUserId(e.detail);
      setView("userProfile");
    };
    window.addEventListener('open-profile', handleOpenProfile);
    return () => window.removeEventListener('open-profile', handleOpenProfile);
  }, []);

  const fetchPosts = async (reset = false) => {
    if (loading || (loadingMore && !reset)) return;
    
    if (reset) {
      setLoading(true);
      setCursor(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentCursor = reset ? null : cursor;
      const res = await api.get(`/api/posts?limit=10${currentCursor ? `&cursor=${currentCursor}` : ""}`);
      
      const newPosts = res.data.posts;
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setCursor(res.data.nextCursor);
      setHasMore(res.data.nextCursor !== null);
      
      if (user) fetchUnreadCount(user.id);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchUnreadCount = async (uid: number) => {
    try {
      const res = await api.get(`/api/notifications/${uid}/unread-count`);
      setUnreadNotifications(res.data.count);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      const interval = setInterval(() => fetchUnreadCount(user.id), 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;
    
    setAuthLoading(true);
    try {
      const endpoint = authMode === "register" ? "/api/users/register" : "/api/users/login";
      const res = await api.post(endpoint, { 
        name: name.trim(), 
        email: email.trim().toLowerCase() 
      });
      setUser(res.data);
      localStorage.setItem("social_user", JSON.stringify(res.data));
      setView("feed");
      toast.success(`Welcome back, ${res.data.name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed. Please check your details.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("social_user");
    setView("auth");
    toast.info("Logged out.");
  };

  const refreshHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if(view === "feed") {
      fetchPosts(true);
    } else {
      setView("feed");
    }
  };

  if (view === "auth") {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#fdfcfb]">
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
                <img src="/logo.png" alt="EHH Logo" className="h-16 w-auto" />
              </motion.div>
              <h1 className="text-4xl font-black text-slate-900 mb-1 tracking-tighter uppercase">EHH</h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] text-center">Helping humans and humanity</p>
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
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-4 tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-7 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-400 outline-none transition-all duration-300"
                  placeholder="EHH@gmail.com"
                />
              </div>
              
              <button 
                disabled={authLoading}
                className="group w-full relative h-16 mt-4 overflow-hidden rounded-2xl bg-slate-900 font-black text-white transition-all hover:bg-slate-800 active:scale-95 shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {authLoading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {authMode === "login" ? "Login" : "SignUp"}
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>
            
            <div className="mt-12 flex flex-col items-center">
              <button 
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                className="text-sm text-slate-400 hover:text-slate-900 font-bold transition-all"
              >
                {authMode === "login" ? "New to EHH? Signup" : "Already EHH member? Login"}
              </button>
              <div className="mt-8 flex items-center gap-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                <span className="h-[1px] w-8 bg-slate-100" />
                <span>Welcome to EHH | Be the climate leaders</span>
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
      {view !== "admin" && (
        <nav className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-100 z-[100] flex items-center shadow-sm">
          <div className="w-full max-w-[1920px] mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={refreshHome}>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 transition-all">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <NavButton active={view === "feed"} onClick={refreshHome} icon={<Home size={20} />} label="Home" />
              <NavButton active={view === "search"} onClick={() => setView("search")} icon={<Search size={20} />} label="Search" />
              <NavButton active={view === "upload"} onClick={() => setView("upload")} icon={<PlusSquare size={20} />} label="Post" />
              <NavButton active={view === "notifications"} onClick={() => setView("notifications")} icon={<Bell size={20} />} label="Notifications" badge={unreadNotifications} />
              <NavButton active={view === "messages"} onClick={() => setView("messages")} icon={<Send size={20} />} label="Messages" />
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

      <main className={`${view === "admin" ? "w-full" : "w-full max-w-[1920px] mx-auto px-6 py-6"}`}>
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
              <h3 className="text-red-100 font-black text-xl tracking-tight">Account Blocked</h3>
              <p className="text-red-400/80 text-sm font-medium mt-1">
                Your account is currently suspended for: <span className="text-red-400 font-bold underline decoration-red-500/50 underline-offset-4">{user.banReason || "Not following our rules"}</span>. 
                {user.banUntil ? ` You can use the app again on ${new Date(user.banUntil).toLocaleDateString()}.` : " This block is permanent."}
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {view === "feed" && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="hidden lg:block lg:col-span-3 space-y-6">
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm sticky top-28">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <img src={user?.avatar} className="w-24 h-24 rounded-full border-4 border-slate-50 object-cover shadow-lg" alt="" />
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

              <div className="col-span-1 lg:col-span-6 space-y-8 pb-12">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-[600px] w-full bg-slate-50 border border-slate-100 rounded-[3rem] animate-pulse" />
                  ))
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="p-8 bg-slate-50 rounded-full border border-slate-100">
                      <Camera size={48} className="text-slate-200" />
                    </div>
                    <div className="max-w-xs transition-all">
                      <h3 className="text-xl font-black text-slate-900 uppercase">No signals yet</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Initialize the feed by sharing your first asset.</p>
                      <button onClick={() => setView("upload")} className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">START BROADCAST</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} onRepost={() => fetchPosts(true)} onDelete={() => fetchPosts(true)} />
                    ))}
                    
                    {/* Infinite Scroll Sentinel */}
                    <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                      {loadingMore && (
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                          <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                          Synchronizing...
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="hidden lg:block lg:col-span-3 space-y-6">
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm sticky top-28">
                  {user?.role === "ADMIN" ? (
                    <>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-500" /> App Stats
                      </h3>
                      <div className="space-y-6">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-2xl font-black text-slate-900">{posts.length}</span>
                            <span className="text-[10px] font-bold text-emerald-600">+12%</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Posts</div>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-2xl font-black text-slate-900">100%</span>
                            <span className="text-[10px] font-bold text-emerald-600">ACTIVE</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">App Status</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Protocol Notice</h3>
                      <div className="space-y-6">
                        <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl">
                          <h4 className="font-black text-lg leading-tight uppercase tracking-tighter">Safe Network</h4>
                          <p className="text-[10px] opacity-60 mt-2 font-bold uppercase tracking-widest">All transmissions are end-to-end encrypted and verified.</p>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="flex items-center gap-3 mb-3">
                              <ImageIcon size={14} className="text-slate-900" />
                              <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">EHH Hub</div>
                           </div>
                           <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase">Join our community and share your images accurately.</p>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="mt-8 pt-8 border-t border-slate-50">
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest leading-loose">System: v2.4-stable<br/>Provider: EHH Secure<br/>Status: Synchronized</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "search" && <SearchPage />}
          {view === "upload" && user && <UploadPage onComplete={() => { fetchPosts(true); setView("feed"); }} userId={user.id} />}
          {view === "profile" && user && <ProfilePage user={user} isOwnProfile={true} onLogout={logout} />}
          {view === "userProfile" && targetUserId && <ProfilePage userId={targetUserId} isOwnProfile={false} currentUserId={user?.id} />}
          {view === "notifications" && user && <NotificationPage user={user} onRead={() => fetchUnreadCount(user.id)} />}
          {view === "messages" && user && <MessagingPage currentUser={user} />}
          {view === "lostfound" && <LostFoundPage />}
          {view === "admin" && <Admin onComplete={() => { fetchPosts(true); setView("feed"); }} />}
        </AnimatePresence>
      </main>

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
          <MobileNavButton active={view === "profile"} onClick={() => setView("profile")} icon={<UserIcon size={24} />} />
        </nav>
      )}

      <ToastContainer theme="light" position="bottom-right" aria-label="System Notifications" />
    </div>
  );
}

function NavButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button 
      onClick={onClick} 
      className={`group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all ${active ? "bg-white shadow-sm ring-1 ring-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
    >
      <span className={`relative z-10 transition-transform ${active ? "scale-110" : "opacity-60 group-hover:opacity-100"}`}>{icon}</span>
      <span className="relative z-10 text-[10px] font-black uppercase tracking-widest hidden lg:block">{label}</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-full transition-all ${active ? "text-slate-900" : "text-slate-300"}`}>
      {icon}
    </button>
  );
}
