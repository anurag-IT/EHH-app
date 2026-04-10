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
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Admin from "./pages/Admin";

// --- Types ---
interface User {
  id: number;
  name: string;
  email: string;
  uniqueId: string;
  avatar: string;
}

interface Post {
  id: number;
  userId: number;
  user: User;
  imagePath: string;
  caption: string;
  sha256: string;
  phash: string;
  parentId: number | null;
  parent?: Post;
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
    try {
      const res = await axios.get("/api/posts");
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to fetch posts", err);
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
    } catch (err: any) {
      alert(err.response?.data?.error || "Auth failed");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("social_user");
    setView("auth");
  };

  if (view === "auth") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">Smart Social</h1>
          <p className="text-gray-400 text-center mb-8 text-sm">Image Tracking & Identity System</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                placeholder="john@example.com"
              />
            </div>
            <button className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all">
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
          
          <button 
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
            className="w-full mt-6 text-sm text-gray-500 hover:text-green-600 transition-colors"
          >
            {authMode === "login" ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white text-black font-sans ${view === "admin" ? "" : "pb-20 md:pb-0 md:pt-16"}`}>
      {/* Top Nav (Desktop) */}
      {view !== "admin" && (
        <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 items-center shadow-sm">
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-6">
            <div className="flex items-center cursor-pointer shrink-0" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); if(view==="feed") fetchPosts(); setView("feed"); }}>
              <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
            </div>
            
            <div className="flex items-center gap-8 bg-gray-50/50 px-6 py-2 rounded-2xl border border-gray-100/50">
              <NavButton active={view === "feed"} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); if(view==="feed") fetchPosts(); setView("feed"); }} icon={<Home size={22} />} label="Home" />
              <NavButton active={view === "search"} onClick={() => setView("search")} icon={<Search size={22} />} label="Search" />
              <NavButton active={view === "upload"} onClick={() => setView("upload")} icon={<PlusSquare size={22} />} label="Create" />
              <NavButton active={view === "lostfound"} onClick={() => setView("lostfound")} icon={<Bell size={22} />} label="Lost & Found" />
              <NavButton active={view === "profile"} onClick={() => setView("profile")} icon={<UserIcon size={22} />} label="Profile" />
              <NavButton active={view === "admin"} onClick={() => setView("admin")} icon={<ShieldAlert size={22} className="text-red-500" />} label="Dev Admin" />
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-xl transition-all duration-300 group" title="Sign Out">
                 <LogOut size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className={view === "admin" ? "w-full" : "max-w-2xl mx-auto px-4 py-8"}>
        <AnimatePresence mode="wait">
          {view === "feed" && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onRepost={() => fetchPosts()} onDelete={() => fetchPosts()} />
              ))}
            </motion.div>
          )}

          {view === "search" && <SearchPage />}
          {view === "upload" && <UploadPage onComplete={() => { fetchPosts(); setView("feed"); }} userId={user?.id || 0} />}
          {view === "profile" && user && <ProfilePage user={user} posts={posts.filter(p => p.userId === user.id)} />}
          {view === "lostfound" && <LostFoundPage />}
          {view === "admin" && <Admin onComplete={() => { fetchPosts(); setView("feed"); }} />}
        </AnimatePresence>
      </main>

      {/* Bottom Nav (Mobile) */}
      {view !== "admin" && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-50">
        <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); if(view==="feed") fetchPosts(); setView("feed"); }} className={view === "feed" ? "text-green-600" : "text-gray-300"}><Home size={24} /></button>
        <button onClick={() => setView("search")} className={view === "search" ? "text-green-600" : "text-gray-300"}><Search size={24} /></button>
        <button onClick={() => setView("upload")} className={view === "upload" ? "text-green-600" : "text-gray-300"}><PlusSquare size={24} /></button>
        <button onClick={() => setView("lostfound")} className={view === "lostfound" ? "text-green-600" : "text-gray-300"}><Bell size={24} /></button>
        <button onClick={() => setView("profile")} className={view === "profile" ? "text-green-600" : "text-gray-300"}><UserIcon size={24} /></button>
        <button onClick={() => setView("admin")} className={view === "admin" ? "text-green-600" : "text-gray-300"}><ShieldAlert size={24} /></button>
      </nav>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 transition-all ${active ? "text-green-600 font-bold" : "text-gray-400 hover:text-green-600"}`}>
      {icon}
      <span className="text-sm hidden lg:block">{label}</span>
    </button>
  );
}

function PostCard({ post, onRepost, onDelete }: { post: Post, onRepost: () => void | Promise<void>, onDelete: () => void | Promise<void>, key?: any }) {
  const [showChain, setShowChain] = useState(false);
  const [chain, setChain] = useState<Post[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [liked, setLiked] = useState(false);

  const handleReport = async () => {
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    try {
      await axios.post(`/api/posts/${post.id}/report`, { userId: user.id, reason: reportReason });
      alert("Report submitted successfully. Thank you.");
      setShowReport(false);
      setReportReason("");
    } catch {
      alert("Failed to submit report");
    }
  };

  const handleLike = async () => {
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    try {
      const res = await axios.post(`/api/posts/${post.id}/like`, { userId: user.id });
      setLiked(res.data.liked);
    } catch { }
  };

  const handleRepost = async () => {
    const user = JSON.parse(localStorage.getItem("social_user") || "{}");
    try {
      await axios.post("/api/posts", {
        userId: user.id,
        caption: `Reposted from @${post.user.name}`,
        parentId: post.id
      });
      onRepost();
    } catch (err) {
      alert("Repost failed");
    }
  };

  const handleDeleteRelated = async () => {
    if (!confirm("Are you sure you want to delete this post and all its similar versions? (Moderation Action)")) return;
    try {
      await axios.delete(`/api/posts/${post.id}/related`);
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
      console.error("Chain fetch failed", err);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={post.user.avatar || ""} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
          <div>
            <div className="font-bold text-sm">{post.user.name}</div>
            <div className="text-[10px] text-gray-400 font-mono tracking-tighter">{post.user.uniqueId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDeleteRelated} className="text-gray-300 hover:text-red-500 transition-colors" title="Admin Force Delete">
            <ShieldAlert size={18} />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-50 relative group">
        <img src={`/uploads/${post.imagePath}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        {post.parentId && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Repeat2 size={10} />
            REPOST
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 w-full justify-start">
            <motion.button 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }}
              onClick={handleLike} 
              className={`transition-colors ${liked ? "text-red-500" : "text-gray-800 hover:text-red-500"}`}
            >
              {liked ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                  <Heart size={24} fill="currentColor" />
                </motion.div>
              ) : (
                <Heart size={24} fill="none" />
              )}
            </motion.button>
            
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fetchChain} className="text-gray-800 hover:text-green-500 transition-colors">
              <MessageCircle size={24} />
            </motion.button>
            
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowReport(true)} className="text-gray-800 hover:text-red-500 transition-colors">
              <Flag size={24} />
            </motion.button>

            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleRepost} className="text-gray-800 hover:text-blue-500 transition-colors">
              <Repeat2 size={24} />
            </motion.button>
          </div>
        </div>

        <div>
          <span className="font-bold text-sm mr-2">{post.user.name}</span>
          <span className="text-sm text-gray-700">{post.caption}</span>
        </div>

        {post.parent && (
          <div className="bg-gray-50 p-3 rounded-xl text-xs border border-gray-100">
            <div className="text-gray-400 mb-1 flex items-center gap-1">
              <Repeat2 size={12} /> Original by @{post.parent.user.name}
            </div>
            <p className="italic text-gray-500">"{post.parent.caption}"</p>
          </div>
        )}

        <div className="text-[10px] text-gray-300 uppercase font-bold tracking-widest">
          {new Date(post.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Chain Modal */}
      <AnimatePresence>
        {showChain && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-lg">Image Tracking Chain</h3>
                <button onClick={() => setShowChain(false)}><X size={24} /></button>
              </div>
              <div className="overflow-y-auto p-6 space-y-4">
                <p className="text-sm text-gray-400 mb-4">Tracing all instances of this image across the platform (SHA256 & pHash matches).</p>
                {chain.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <img src={`/uploads/${p.imagePath}`} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                       <div className="font-bold text-sm truncate">@{p.user.name}</div>
                       <div className="text-xs text-gray-500 truncate">{p.caption}</div>
                    </div>
                    <div className="text-[10px] font-bold text-blue-500">
                      {p.id === post.id ? "CURRENT" : p.parentId === post.id ? "REPOST" : "SIMILAR"}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-3xl p-6">
              <h3 className="font-bold text-xl mb-4 text-red-500 flex items-center gap-2"><Flag /> Report Content</h3>
              <p className="text-sm text-gray-500 mb-4">Help us keep the community safe. Why are you reporting this post?</p>
              <div className="space-y-2">
                {["Spam", "Violence", "Adult Content", "Misinformation", "Other"].map(r => (
                  <button key={r} onClick={() => setReportReason(r)} className={`w-full p-3 rounded-xl border text-left font-bold ${reportReason === r ? 'bg-red-50 border-red-500 text-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-6">
                 <button onClick={() => setShowReport(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                 <button onClick={handleReport} disabled={!reportReason} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-red-500">Submit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadPage({ onComplete, userId }: { onComplete: () => void, userId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("userId", userId.toString());
    formData.append("caption", caption);

    try {
      await axios.post("/api/posts", formData);
      onComplete();
    } catch (err) {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-bold mb-6">Create New Post</h2>
        
        <div 
          className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all overflow-hidden relative"
          onClick={() => document.getElementById("post-file")?.click()}
        >
          {preview ? (
            <img src={preview} className="w-full h-full object-cover" />
          ) : (
            <>
              <PlusSquare size={48} className="text-gray-300 mb-2" />
              <p className="text-gray-400 font-medium">Select Image</p>
            </>
          )}
          <input id="post-file" type="file" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
          }} />
        </div>

        <div className="mt-6 space-y-4">
          <textarea 
            placeholder="Write a caption..." 
            className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-black/5 outline-none resize-none h-32"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button 
            disabled={!file || loading}
            onClick={handleUpload}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50"
          >
            {loading ? "Posting..." : "Share Post"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SearchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setLoading(true);
    const formData = new FormData();
    formData.append("image", f);

    try {
      const res = await axios.post("/api/posts/search", formData);
      setResults(res.data);
    } catch (err) {
      alert("Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Visual Search</h2>
        <p className="text-gray-400">Upload an image to find all related posts and reposts across the network.</p>
        
        <div className="pt-4">
          <label className="bg-green-600 text-white px-8 py-4 rounded-2xl font-bold cursor-pointer hover:bg-green-700 transition-all inline-flex items-center gap-2">
            <Search size={20} />
            {loading ? "Analyzing..." : "Upload Image to Search"}
            <input type="file" className="hidden" onChange={handleSearch} />
          </label>
        </div>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {results.map((post) => (
            <div key={post.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <img src={`/uploads/${post.imagePath}`} className="w-full aspect-square object-cover" />
              <div className="p-3">
                <div className="font-bold text-xs truncate">@{post.user.name}</div>
                <div className="text-[10px] text-blue-500 font-bold">MATCH FOUND</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ProfilePage({ user, posts }: { user: User, posts: Post[] }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/messages/${user.id}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Messages fetch failed", err);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col items-center text-center space-y-4">
        <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-white shadow-lg" />
        <div>
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <div className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest text-gray-500 mt-1">
            {user.uniqueId}
          </div>
        </div>
        <div className="flex gap-8 pt-4">
          <div className="text-center">
            <div className="font-bold text-xl">{posts.length}</div>
            <div className="text-xs text-gray-400 uppercase font-bold tracking-widest">Posts</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-xl">{messages.length}</div>
            <div className="text-xs text-gray-400 uppercase font-bold tracking-widest">Messages</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {posts.map((post) => (
          <div key={post.id} className="aspect-square bg-gray-100 relative group">
            <img src={`/uploads/${post.imagePath}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Heart size={20} fill="white" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Bell size={20} />
          Anonymous Messages
        </h3>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">{msg.messageText}</p>
              <div className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                {new Date(msg.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LostFoundPage() {
  const [uniqueId, setUniqueId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/messages/send", { uniqueId, messageText: message });
      setSuccess(true);
      setMessage("");
      setUniqueId("");
    } catch (err) {
      alert("Failed to send message. Check the ID.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-12 h-12 bg-green-600 text-white rounded-xl flex items-center justify-center mb-6">
          <Bell size={24} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Lost & Found</h2>
        <p className="text-gray-400 text-sm mb-8">Send an anonymous message to any user using their unique EH-ID.</p>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Recipient ID</label>
            <input 
              type="text" 
              required 
              placeholder="EH-XXXXXX"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black/5 outline-none font-mono tracking-widest"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Message</label>
            <textarea 
              required 
              placeholder="Your anonymous message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black/5 outline-none h-32 resize-none"
            />
          </div>
          
          {success && <p className="text-green-500 text-sm font-bold">Message sent successfully!</p>}

          <button className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2">
            <Send size={18} />
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
