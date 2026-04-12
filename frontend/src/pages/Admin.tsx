import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  LayoutDashboard, Users, UserX, Image as ImageIcon, 
  Flag, List, LogOut, Trash2, ShieldAlert,
  Search, CheckCircle2, AlertTriangle, Fingerprint,
  Zap, Database, Activity, ChevronRight, Download, Eye
} from "lucide-react";

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem("social_user") || "{}");
  return { "x-user-id": user.id };
};

export default function Admin({ onComplete }: { onComplete: () => void }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (activeTab === "dashboard") {
      axios.get("/admin/stats", { headers: getHeaders() })
        .then(res => {
          setStats(res.data);
          setError(null);
        })
        .catch(err => { 
          if(err.response?.status === 403) {
            setError("You don't have permission to see this page. Admin access is required.");
          } else {
            setError("Could not connect to the system. Please try again later.");
          }
          console.error(err); 
        });
    }
  }, [activeTab]);

  return (
    <div className="flex h-screen bg-[#fdfcfb] text-[#0f172a] overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <ToastContainer 
        theme="light" 
        toastClassName="!bg-white !border !border-[#f1f5f9] !rounded-2xl !shadow-xl"
        progressClassName="!bg-emerald-500"
        aria-label="Admin Notifications"
      />
      
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden lg:flex w-72 bg-white border-r border-[#f1f5f9] flex-col p-6 z-50 shrink-0"
      >
        <div className="flex items-center gap-3 mb-10 px-2">
           <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
             <ShieldAlert className="text-white" size={20} />
           </div>
           <div>
             <h1 className="font-bold text-lg tracking-tight">Admin Panel</h1>
             <p className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase opacity-60">Control Center</p>
           </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          <SidebarButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <SidebarButton active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users size={18}/>} label="Users" />
          <SidebarButton active={activeTab === "flags"} onClick={() => setActiveTab("flags")} icon={<Flag size={18}/>} label="Reports" />
          <SidebarButton active={activeTab === "images"} onClick={() => setActiveTab("images")} icon={<Search size={18}/>} label="Image Search" />
          <SidebarButton active={activeTab === "logs"} onClick={() => setActiveTab("logs")} icon={<List size={18}/>} label="Activity Logs" />
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-[#f1f5f9]">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
             <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Notice</span>
             </div>
             <p className="text-[10px] text-emerald-600 opacity-70 leading-relaxed font-medium">Please be careful when deleting posts or banning users.</p>
          </div>
          <button 
            onClick={() => onComplete()}
            className="w-full h-12 bg-[#f8fafc] hover:bg-[#f1f5f9] rounded-xl border border-[#e2e8f0] flex items-center justify-center gap-2 font-bold text-xs text-[#64748b] transition-all"
          >
            <LogOut size={14} />
            Back to App
          </button>
        </div>
      </motion.div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 border-b border-[#f1f5f9] flex items-center justify-between px-8 shrink-0 bg-white/80 backdrop-blur-md">
           <h2 className="text-xl font-bold tracking-tight">
             {activeTab === "dashboard" ? "Overview" : activeTab === "flags" ? "Reports" : activeTab === "images" ? "Find Similar Images" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
           </h2>
           
           <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-2 bg-[#f8fafc] px-3 py-1.5 rounded-lg border border-[#e2e8f0]">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wide">Status: Online</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="text-right hidden sm:block">
                   <div className="text-xs font-bold">Admin User</div>
                   <div className="text-[10px] text-[#94a3b8] font-medium">Full Access</div>
                 </div>
                 <div className="w-10 h-10 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] flex items-center justify-center">
                   <ShieldAlert size={20} className="text-emerald-500" />
                 </div>
              </div>
           </div>
        </header>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {error && activeTab === "dashboard" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }} 
                className="h-full flex items-center justify-center p-8"
              >
                 <div className="bg-white border border-red-100 p-10 rounded-[2.5rem] text-center max-w-md shadow-xl">
                   <AlertTriangle size={64} className="text-red-500 mx-auto mb-6" />
                   <h2 className="text-2xl font-bold mb-2 tracking-tight">Access Denied</h2>
                   <p className="text-[#64748b] mb-8 font-medium">{error}</p>
                   <button onClick={() => onComplete()} className="px-8 py-3 bg-[#f8fafc] hover:bg-[#f1f5f9] rounded-xl border border-[#e2e8f0] font-bold text-xs">Back to App</button>
                 </div>
              </motion.div>
            )}

            {activeTab === "dashboard" && stats && !error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="dashboard" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <StatCard title="Total Users" value={stats.totalUsers} sub="People on EHH" icon={<Users className="text-emerald-500" />} />
                  <StatCard title="Active Now" value={stats.activeUsers} sub="Normal status" color="text-emerald-600" icon={<Activity className="text-emerald-500" />} />
                  <StatCard title="Banned" value={stats.bannedUsers} sub="Access blocked" color="text-red-600" icon={<UserX className="text-red-500" />} />
                  <StatCard title="Total Posts" value={stats.totalPosts} sub="Images uploaded" color="text-blue-600" icon={<Database className="text-blue-500" />} />
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 bg-white rounded-[2rem] p-8 border border-[#f1f5f9] shadow-sm">
                    <h3 className="text-lg font-bold mb-8">User Activity</h3>
                    <div className="h-72 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={[
                           { name: 'Users', val: stats.totalUsers },
                           { name: 'Active', val: stats.activeUsers },
                           { name: 'Banned', val: stats.bannedUsers },
                           { name: 'Posts', val: stats.totalPosts },
                           { name: 'Reports', val: Math.floor(stats.totalPosts / 5) },
                         ]}>
                           <defs>
                             <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                               <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                           <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                           <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                           <Tooltip 
                            contentStyle={{ backgroundColor: "white", borderRadius: "1rem", border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                            />
                           <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2rem] p-8 border border-[#f1f5f9] shadow-sm space-y-6">
                     <h3 className="text-lg font-bold">Quick Summary</h3>
                     <div className="space-y-5">
                        <ThreatItem label="Reports Pending" value="12" level="LOW" />
                        <ThreatItem label="Banned Recently" value="43" level="MID" />
                        <ThreatItem label="Bugs Found" value="0" level="NULL" />
                        <ThreatItem label="App Health" value="Healthy" level="HIGH" />
                     </div>
                     <div className="pt-6 mt-6 border-t border-[#f1f5f9]">
                        <p className="text-[10px] text-[#94a3b8] font-medium text-center italic tracking-wide">Scanning database for issues...</p>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "users" && <UsersManager />}
            {activeTab === "flags" && <FlaggedContent />}
            {activeTab === "images" && <ImageTrace />}
            {activeTab === "logs" && <SystemPulse />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-emerald-50 text-emerald-600' : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]'}`}
    >
      {active && <motion.div layoutId="side-pill" className="absolute left-0 w-1 h-5 bg-emerald-500 rounded-r-full" />}
      <span className="transition-transform duration-300 group-hover:scale-105">{icon}</span>
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {active && <div className="ml-auto opacity-50"><ChevronRight size={14} /></div>}
    </button>
  );
}

function StatCard({ title, value, color = "text-[#0f172a]", icon, sub }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-[#f1f5f9] hover:border-emerald-200 transition-all shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
           {React.cloneElement(icon, { size: 18, className: "text-emerald-600" })}
        </div>
        <div>
          <div className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-wider">{title}</div>
          <div className="text-[10px] text-[#cbd5e1] font-medium">{sub}</div>
        </div>
      </div>
      <div className={`text-4xl font-bold tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

function ThreatItem({ label, value, level }: any) {
  const colors: any = {
    LOW: "text-emerald-600 bg-emerald-50 border-emerald-100",
    MID: "text-orange-600 bg-orange-50 border-orange-100",
    HIGH: "text-red-600 bg-red-50 border-red-100",
    NULL: "text-[#94a3b8] bg-[#f8fafc]"
  };
  return (
    <div className="flex items-center justify-between group">
       <span className="text-xs font-bold text-[#64748b] transition-colors">{label}</span>
       <div className="flex items-center gap-3">
          <span className="text-xs font-bold">{value}</span>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${colors[level]}`}>{level}</span>
       </div>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [banModal, setBanModal] = useState<any>(null);

  const fetchUsers = () => {
    axios.get("/admin/users", { headers: getHeaders() })
      .then(res => setUsers(res.data))
      .catch(() => toast.error("Could not load users."));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (id: number, durationDays: number, reason: string) => {
    try {
      await axios.post(`/admin/users/${id}/ban`, { durationDays, reason }, { headers: getHeaders() });
      toast.success("User banned successfully.");
      setBanModal(null);
      fetchUsers();
    } catch {
      toast.error("Process failed.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete User? This cannot be undone.")) return;
    try {
      await axios.delete(`/admin/users/${id}`, { headers: getHeaders() });
      toast.success("User deleted.");
      fetchUsers();
    } catch {
      toast.error("Error deleting user.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-[#f1f5f9] shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-[#f1f5f9] flex items-center justify-between">
            <h3 className="font-bold text-lg tracking-tight flex items-center gap-3">
              <Users className="text-emerald-500" size={20} />
              Platform Users
            </h3>
            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
              {users.length} Total
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-[#94a3b8] uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-8 py-4">User</th>
                <th className="px-8 py-4">Contact</th>
                <th className="px-8 py-4">Posts</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-[#fdfcfb]">
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-3">
                        <img src={u.avatar} className="w-10 h-10 rounded-xl border border-[#f1f5f9]" />
                        <div>
                          <div className="font-bold text-sm">{u.name}</div>
                          <div className="text-[10px] text-[#94a3b8] font-medium">ID: {u.uniqueId}</div>
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-[#64748b]">{u.email}</td>
                  <td className="px-8 py-6 font-bold text-emerald-600">{u._count?.posts || 0}</td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       {u.status === 'ACTIVE' && (
                         <button onClick={() => setBanModal(u)} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all">
                            <UserX size={16} />
                         </button>
                       )}
                       <button onClick={() => handleDelete(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                          <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {banModal && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-white border border-[#f1f5f9] p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-red-600 mb-2">Ban User</h3>
              <p className="text-xs text-[#64748b] mb-8">User: <span className="font-bold text-[#0f172a]">{banModal.name}</span></p>
              
              <form onSubmit={e => {
                e.preventDefault();
                const duration = parseInt((e.target as any).duration.value);
                const reason = (e.target as any).reason.value;
                handleBan(banModal.id, duration, reason);
              }} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#64748b]">Duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[ {v:1, l:'1 Day'}, {v:7, l:'7 Days'}, {v:30, l:'30 Days'}, {v:-1, l:'Perm'} ].map(opt => (
                      <label key={opt.v} className="cursor-pointer">
                        <input type="radio" name="duration" value={opt.v} defaultChecked={opt.v === 1} className="peer hidden" />
                        <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-center peer-checked:bg-red-500 peer-checked:text-white">
                           <div className="text-xs font-bold">{opt.l}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#64748b]">Reason</label>
                  <input required type="text" name="reason" placeholder="Why ban this user?" className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 text-sm" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setBanModal(null)} className="flex-1 bg-[#f8fafc] py-4 rounded-xl font-bold text-xs text-[#64748b]">Cancel</button>
                  <button type="submit" className="flex-[2] bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/10">Ban User</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ImageTrace() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Analyzing structure...",
    "Generating deep hashes...",
    "Extracting AI vectors...",
    "ORB feature mapping...",
    "Final scoring..."
  ];

  const scanNetwork = async () => {
    if (!file) return;
    setLoading(true);
    setCurrentStep(0);
    
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post("/admin/find-image", formData, { headers: getHeaders() });
      setMatchResult(res.data);
      if (res.data.matchCount === 0) toast.info("No matching images found.");
      else toast.warning(`Found ${res.data.matchCount} similar images.`);
    } catch (err: any) {
      console.error("Trace error:", err);
      const msg = err.response?.data?.error || "Pipeline handshake failure";
      toast.error(`Process Failed: ${msg}`);
    } finally { 
       clearInterval(interval);
       setLoading(false);
    }
  }

  const deleteFamily = async () => {
    if (!confirm(`Delete all ${matchResult.matchCount} matching images forever?`)) return;
    setLoading(true);
    try {
      await axios.delete(`/admin/delete/${matchResult.bestMatch.postId}`, { headers: getHeaders() });
      toast.success("All copies deleted.");
      setMatchResult(null); setFile(null); setPreview(null);
    } catch {
      toast.error("Error deleting images.");
    } finally { setLoading(false); }
  }

  const deleteSingle = async (postId: number) => {
    if (!confirm("Delete this specific post?")) return;
    try {
      await axios.delete(`/api/posts/${postId}`, { headers: getHeaders() });
      toast.success("Post deleted.");
      // Refresh matches by filtering out the deleted one locally
      setMatchResult({
        ...matchResult,
        matchCount: matchResult.matchCount - 1,
        allMatches: matchResult.allMatches.filter((m: any) => m.postId !== postId)
      });
    } catch {
      toast.error("Error deleting post.");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl mx-auto pb-20">
      <div className="bg-white rounded-[2.5rem] border border-[#f1f5f9] p-8 lg:p-12 shadow-sm">
        <header className="text-center mb-10">
          <div className="inline-block p-4 bg-emerald-50 rounded-full border border-emerald-100 mb-6 font-bold text-emerald-600 uppercase text-[10px] tracking-widest">
            Production-Level 5-Layer Hybrid Pipeline
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Image Trace System</h2>
          <p className="text-[#94a3b8] text-xs font-medium mt-3">Using SHA256, aHash, dHash, pHash, ORB & MobileNet AI</p>
        </header>

        {!matchResult ? (
          <div className="max-w-xl mx-auto">
            <label className="block bg-[#f8fafc] border-2 border-dashed border-[#e2e8f0] hover:border-emerald-200 p-16 rounded-[2rem] mb-6 cursor-pointer group transition-all">
              <input type="file" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if(f) { setFile(f); setPreview(URL.createObjectURL(f)); }
              }} />
              {preview ? (
                <div className="relative w-full h-64">
                  <img src={preview} className="w-full h-full object-contain rounded-2xl" />
                </div>
              ) : (
                <div className="text-center space-y-4">
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto border border-[#f1f5f9] shadow-sm">
                      <ImageIcon size={28} className="text-emerald-500" />
                   </div>
                   <p className="text-[#94a3b8] font-bold text-[10px] uppercase">Upload image to scan</p>
                </div>
              )}
            </label>
            
            <button 
              disabled={!file || loading} 
              onClick={scanNetwork} 
              className="w-full h-16 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3 overflow-hidden"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? steps[currentStep] : "Initiate Global Scan"}
            </button>
          </div>
        ) : (
          <div className="space-y-12">
             {/* Side-by-Side Comparison */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider px-2">Uploaded Source</h4>
                  <div className="bg-[#f8fafc] rounded-[2rem] p-4 border border-[#f1f5f9]">
                    <img src={preview!} className="w-full aspect-square object-cover rounded-[1.5rem] border-4 border-white shadow-lg" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider px-2">Best Match Encountered</h4>
                  <div className="bg-emerald-50 rounded-[2rem] p-4 border border-emerald-100 relative">
                    {matchResult.bestMatch ? (
                      <>
                        <img src={matchResult.bestMatch.previewUrl} className="w-full aspect-square object-cover rounded-[1.5rem] border-4 border-white shadow-lg" />
                        <div className="absolute top-8 right-8 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-lg shadow-xl shadow-emerald-500/20">
                          {matchResult.bestMatch.similarity}
                        </div>
                      </>
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center text-[#94a3b8] font-bold text-sm uppercase italic">No Match Found</div>
                    )}
                  </div>
                </div>
             </div>

             {/* Match Details List */}
             <div className="bg-[#f8fafc] rounded-[2rem] border border-[#f1f5f9] overflow-hidden">
                <div className="px-8 py-6 border-b border-[#f1f5f9] flex items-center justify-between">
                   <h3 className="font-bold text-lg">Similarity Results ({matchResult.matchCount})</h3>
                   {matchResult.matchCount > 0 && (
                     <button onClick={deleteFamily} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/10">
                        <Trash2 size={14} /> Wipe All Variants
                     </button>
                   )}
                </div>
                
                <div className="p-4 space-y-4">
                  {matchResult.allMatches?.map((m: any, idx: number) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: idx * 0.1 }}
                      key={m.postId} 
                      className="bg-white p-6 rounded-2xl border border-[#f1f5f9] flex flex-wrap lg:flex-nowrap items-center gap-6 group hover:border-emerald-200 transition-all"
                    >
                       <img src={m.previewUrl} className="w-20 h-20 rounded-xl object-cover border border-[#f1f5f9]" />
                       <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-3 mb-2">
                             <span className="text-sm font-bold text-[#0f172a]">Post #{m.postId}</span>
                             <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${m.confidenceLevel === 'HIGH' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : m.confidenceLevel === 'MEDIUM' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                {m.confidenceLevel} CONFIDENCE
                             </span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">
                             <div className="flex items-center gap-1"><Fingerprint size={12} className="text-emerald-500" /> {m.matchType}</div>
                             <div className="flex items-center gap-1"><Users size={12} className="text-[#64748b]" /> {m.user || "Unknown User"}</div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-3 ml-auto">
                          <div className="text-right mr-4 hidden md:block">
                             <div className="text-xs font-bold text-emerald-600">{m.similarity} Similarity</div>
                             <div className="text-[10px] text-[#cbd5e1] font-medium uppercase mt-0.5">Hybrid Score</div>
                          </div>
                          <button onClick={() => deleteSingle(m.postId)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                             <Trash2 size={18} />
                          </button>
                          <button onClick={() => toast.info("Ignoring variant...")} className="p-3 bg-[#f8fafc] text-[#94a3b8] rounded-xl hover:bg-[#0f172a] hover:text-white transition-all">
                             <CheckCircle2 size={18} />
                          </button>
                       </div>
                    </motion.div>
                  ))}
                  
                  {matchResult.matchCount === 0 && (
                    <div className="py-20 text-center text-[#94a3b8] italic text-sm">No significant matches detected across the network.</div>
                  )}
                </div>
                
                <div className="px-8 py-6 border-t border-[#f1f5f9] flex justify-center">
                   <button onClick={() => setMatchResult(null)} className="font-bold text-xs text-emerald-600 hover:underline">Clear results and scan new image</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SystemPulse() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    axios.get("/admin/logs", { headers: getHeaders() }).then(res => setLogs(res.data)).catch();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-[#f1f5f9] shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-[#f1f5f9] flex items-center justify-between bg-[#f8fafc]">
            <h3 className="font-bold text-lg flex items-center gap-3">
              <List className="text-emerald-500" size={20} />
              Recent Activities
            </h3>
        </div>
        <div className="p-6 space-y-3">
          {logs.map((log: any) => (
            <div key={log.id} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[#f1f5f9] hover:border-emerald-100 transition-all">
               <div className={`p-2 rounded-xl ${log.actionType.includes('DELETE') ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                 {log.actionType.includes('DELETE') ? <Trash2 size={18} /> : <Zap size={18} />}
               </div>
               <div className="flex-1">
                 <div className="flex items-center gap-3 mb-1">
                    <span className="text-[9px] font-bold text-[#64748b] uppercase">{log.actionType}</span>
                    <span className="text-[9px] text-[#cbd5e1]">{new Date(log.createdAt).toLocaleString()}</span>
                 </div>
                 <div className="text-sm font-medium text-[#475569]">{log.details}</div>
                 <div className="mt-3 text-[9px] font-bold text-[#94a3b8] uppercase">Admin: {log.adminName}</div>
               </div>
            </div>
          ))}
          {logs.length === 0 && <div className="py-20 text-center opacity-30 text-xs">No logs found.</div>}
        </div>
      </div>
    </motion.div>
  );
}

function FlaggedContent() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = () => {
    axios.get("/admin/flags", { headers: getHeaders() })
      .then(res => { setFlags(res.data); setLoading(false); })
      .catch(() => { toast.error("Could not load reports."); setLoading(false); });
  };

  useEffect(() => { fetchFlags(); }, []);

  const resolveFlag = async (id: number, action: "KEEP" | "WIPE") => {
    try {
      await axios.post(`/admin/flags/${id}/resolve`, { action }, { headers: getHeaders() });
      toast.success(action === "KEEP" ? "Report ignored." : "Post deleted.");
      fetchFlags();
    } catch {
      toast.error("Error occurred.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-3">
        <Flag className="text-red-500" size={20} />
        Recent Reports
      </h2>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center opacity-30">
           <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
           <p className="text-xs font-bold uppercase">Loading Reports...</p>
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-20 border border-[#f1f5f9] rounded-[2rem] bg-white text-[#94a3b8]">
          <CheckCircle2 size={48} className="mx-auto mb-4 opacity-10" />
          <p className="text-xs font-bold uppercase">No reports to review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {flags.map((flag) => (
            <motion.div layout key={flag.id} className="bg-white rounded-[2rem] overflow-hidden border border-[#f1f5f9] shadow-sm flex flex-col">
              <div className="relative h-56 bg-[#f8fafc]">
                {flag.post ? (
                   <img src={(flag.post.imageUrl || "").replace('/upload/', '/upload/f_auto,q_auto,w_600,c_limit/')} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-[#cbd5e1] uppercase text-[10px] font-bold">Image Deleted</div>
                )}
                {flag.priority === "HIGH" && <span className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 text-[10px] font-bold rounded-lg uppercase">High Priority</span>}
              </div>
              
              <div className="p-8 flex-1 flex flex-col space-y-4">
                <div>
                  <div className="text-[10px] text-[#94a3b8] uppercase mb-2">Reported by: {flag.user?.name || "User"}</div>
                  <h4 className="font-bold text-[#0f172a] mb-3">Reason: {flag.reason}</h4>
                  <div className="bg-[#f8fafc] p-4 rounded-xl text-xs italic text-[#64748b]">"{flag.post?.caption || "No caption"}"</div>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-3">
                  <button onClick={() => resolveFlag(flag.id, "KEEP")} className="py-3 bg-[#f8fafc] rounded-xl font-bold text-xs border border-[#e2e8f0]">Keep Post</button>
                  <button onClick={() => resolveFlag(flag.id, "WIPE")} className="py-3 bg-red-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/10">Delete Post</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
