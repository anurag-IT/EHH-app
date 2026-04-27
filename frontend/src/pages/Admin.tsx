import React, { useState, useEffect } from "react";
import api from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  LayoutDashboard, Users, UserX, Image as ImageIcon, 
  Flag, List, LogOut, Trash2, ShieldAlert,
  Search, CheckCircle2, AlertTriangle, Fingerprint,
  Zap, Database, Activity, ChevronRight, Download, Eye,
  Settings, Bell, Search as SearchIcon
} from "lucide-react";

const getHeaders = () => ({});

export default function Admin({ onComplete }: { onComplete: () => void }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  useEffect(() => {
    if (activeTab === "dashboard") {
      api.get("/admin/stats", { headers: getHeaders() })
        .then(res => {
          setStats(res.data);
          setError(null);
        })
        .catch(err => { 
          if(err.response?.status === 403) {
            setError("Access Restricted: Level 5 clearance required.");
          } else {
            setError("Network Failure: Could not establish secure link.");
          }
          console.error(err); 
        });
    }
  }, [activeTab]);

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden selection:bg-green-500 selection:text-slate-900">
      <ToastContainer theme="dark" />
      
      {/* Dynamic Sidebar */}
      <motion.div 
        initial={false}
        animate={{ width: sidebarOpen ? "280px" : "80px" }}
        className="hidden lg:flex bg-slate-900 border-r border-white/5 flex-col p-4 z-50 shrink-0 transition-all duration-300"
      >
        <div className="flex items-center gap-4 mb-12 px-2 overflow-hidden">
           <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
             <ShieldAlert className="text-slate-950" size={20} />
           </div>
           {sidebarOpen && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <h1 className="font-black text-lg tracking-tighter uppercase italic">EHH ADMIN</h1>
               <p className="text-[8px] text-green-500 font-black tracking-[0.3em] uppercase opacity-60">Deep System Access</p>
             </motion.div>
           )}
        </div>
        
        <nav className="flex-1 space-y-2">
          <SidebarButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard size={20}/>} label="Overview" collapsed={!sidebarOpen} />
          <SidebarButton active={activeTab === "posts"} onClick={() => setActiveTab("posts")} icon={<Database size={20}/>} label="Network Signals" collapsed={!sidebarOpen} />
          <SidebarButton active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users size={20}/>} label="User Registry" collapsed={!sidebarOpen} />
          <SidebarButton active={activeTab === "flags"} onClick={() => setActiveTab("flags")} icon={<Flag size={20}/>} label="Incident Reports" collapsed={!sidebarOpen} />
          <SidebarButton active={activeTab === "images"} onClick={() => setActiveTab("images")} icon={<SearchIcon size={20}/>} label="Signal Trace" collapsed={!sidebarOpen} />
          <SidebarButton active={activeTab === "logs"} onClick={() => setActiveTab("logs")} icon={<List size={20}/>} label="Audit Logs" collapsed={!sidebarOpen} />
        </nav>

        <div className="mt-auto space-y-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full h-12 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-white/5 flex items-center justify-center text-slate-400 transition-all"
          >
            {sidebarOpen ? <ChevronRight className="rotate-180" size={18} /> : <ChevronRight size={18} />}
          </button>
          <button 
            onClick={() => onComplete()}
            className="w-full h-14 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            {sidebarOpen && "EXIT SYSTEM"}
          </button>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-slate-950/50 backdrop-blur-3xl z-40">
           <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black tracking-tighter uppercase italic text-white/90">
                {activeTab === "dashboard" ? "Network Overview" : activeTab === "flags" ? "Incident Review" : activeTab === "posts" ? "Network Signals" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
           </div>
           
           <div className="flex items-center gap-8">
              <div className="hidden xl:flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-xl border border-white/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol: Active Secure Link</span>
              </div>
              <div className="flex items-center gap-4 border-l border-white/10 pl-8">
                 <div className="text-right hidden sm:block">
                   <div className="text-xs font-black text-white uppercase tracking-tight">Root Administrator</div>
                   <div className="text-[9px] text-green-500 font-black uppercase tracking-widest">Clearance: Level 5</div>
                 </div>
                 <div className="w-12 h-12 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-xl border border-white/10 flex items-center justify-center shadow-xl">
                   <ShieldAlert size={24} className="text-green-500" />
                 </div>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && stats && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} key="dashboard" className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Global Users" value={stats.totalUsers} icon={<Users />} trend="+12%" />
                  <StatCard title="Active Signals" value={stats.totalPosts} icon={<Database />} trend="+8%" />
                  <StatCard title="Security Alerts" value={stats.flaggedCount || 0} icon={<Flag />} color={stats.flaggedCount > 0 ? "text-red-500" : "text-green-500"} />
                  <StatCard title="Eco Points" value={stats.totalPoints || "42.8k"} icon={<Zap />} color="text-yellow-500" trend="+2.4k today" />
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                  <div className="xl:col-span-2 bg-slate-900/50 rounded-[3rem] p-10 border border-white/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-10">
                       <h3 className="text-xl font-black uppercase tracking-tighter italic">Network Growth</h3>
                       <div className="flex gap-2">
                          <button className="px-4 py-2 bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400">7 Days</button>
                          <button className="px-4 py-2 bg-green-500 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-950">30 Days</button>
                       </div>
                    </div>
                    <div className="h-[400px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={[
                           { name: 'Mon', val: 400 },
                           { name: 'Tue', val: 300 },
                           { name: 'Wed', val: 500 },
                           { name: 'Thu', val: 450 },
                           { name: 'Fri', val: 600 },
                           { name: 'Sat', val: 550 },
                           { name: 'Sun', val: 700 },
                         ]}>
                           <defs>
                             <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4}/>
                               <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                           <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                           <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem" }} />
                           <Bar dataKey="val" fill="url(#chartGradient)" radius={[6, 6, 0, 0]} stroke="#22c55e" strokeWidth={2} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-[3rem] p-10 border border-white/5 backdrop-blur-xl flex flex-col">
                     <h3 className="text-xl font-black uppercase tracking-tighter italic mb-8">System Health</h3>
                     <div className="space-y-8 flex-1">
                        <HealthBar label="Server Load" value={34} status="Optimal" />
                        <HealthBar label="API Latency" value={12} status="Low" color="bg-green-500" />
                        <HealthBar label="Storage Usage" value={68} status="Nominal" color="bg-yellow-500" />
                        <HealthBar label="Security Level" value={100} status="Maximum" color="bg-blue-500" />
                     </div>
                     <div className="pt-8 mt-8 border-t border-white/5">
                        <div className="p-5 bg-green-500/10 rounded-2xl border border-green-500/20">
                           <p className="text-[10px] text-green-500 font-black uppercase tracking-widest leading-relaxed">System scan complete: 0 vulnerabilities detected in 24h cycle.</p>
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "posts" && <NetworkSignals />}
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

function SidebarButton({ active, onClick, icon, label, collapsed }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full group relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 ${active ? 'bg-green-500 text-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
    >
      <span className="shrink-0 transition-transform duration-300 group-hover:scale-110">{icon}</span>
      {!collapsed && <span className="text-xs font-black uppercase tracking-widest truncate">{label}</span>}
      {active && !collapsed && <div className="ml-auto"><ChevronRight size={14} /></div>}
    </button>
  );
}

function StatCard({ title, value, color = "text-white", icon, trend }: any) {
  return (
    <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 hover:border-green-500/30 transition-all group backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-green-500 group-hover:border-green-500 transition-all duration-500">
           {React.cloneElement(icon, { size: 24, className: "text-slate-400 group-hover:text-slate-950 transition-colors" })}
        </div>
        {trend && <div className="text-[10px] font-black text-green-500 uppercase tracking-widest">{trend}</div>}
      </div>
      <div className="space-y-1">
        <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{title}</div>
        <div className={`text-4xl font-black tracking-tighter italic ${color}`}>{value}</div>
      </div>
    </div>
  );
}

function HealthBar({ label, value, status, color = "bg-green-500" }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
         <span className="text-slate-500">{label}</span>
         <span className={color.replace('bg-', 'text-')}>{status}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
         <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className={`h-full ${color}`} />
      </div>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [banModal, setBanModal] = useState<any>(null);

  const fetchUsers = () => {
    api.get("/admin/users", { headers: getHeaders() })
      .then(res => setUsers(res.data))
      .catch(() => toast.error("Could not load users."));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (id: number, durationDays: number, reason: string) => {
    try {
      const res = await api.post(`/admin/users/${id}/ban`, { durationDays, reason }, { headers: getHeaders() });
      toast.success(res.data.message || "User banned successfully.");
      setBanModal(null);
      fetchUsers(); // refresh list to show updated strike count
    } catch {
      toast.error("Process failed.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-slate-900/50 rounded-[3rem] border border-white/5 shadow-sm overflow-hidden backdrop-blur-xl">
        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-black text-xl tracking-tighter uppercase italic flex items-center gap-4">
              <Users className="text-green-500" size={24} />
              User Registry
            </h3>
            <div className="text-[10px] font-black text-green-500 bg-green-500/10 px-6 py-2 rounded-full border border-green-500/20 uppercase tracking-widest">
              {users.length} Active Nodes
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-500 uppercase text-[9px] font-black tracking-[0.3em]">
              <tr>
                <th className="px-10 py-6">Node Identifier</th>
                <th className="px-10 py-6">Eco Level</th>
                <th className="px-10 py-6">Signals</th>
                <th className="px-10 py-6">Points</th>
                <th className="px-10 py-6">Status</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-10 py-8">
                     <div className="flex items-center gap-4">
                        <img src={u.avatar} className="w-12 h-12 rounded-2xl border border-white/10 shadow-lg" />
                        <div>
                          <div className="font-black text-white uppercase tracking-tight">{u.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold tracking-widest">{u.uniqueId}</div>
                        </div>
                     </div>
                  </td>
                  <td className="px-10 py-8">
                     <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
                       {u.level || "Beginner"}
                     </span>
                  </td>
                  <td className="px-10 py-8 font-black text-white">{u._count?.posts || 0}</td>
                  <td className="px-10 py-8 font-black text-green-500">{u.points || 0}</td>
                  <td className="px-10 py-8">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {u.status}
                    </span>
                    {(u.banStrike > 0) && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ml-1 ${
                        u.banStrike >= 3 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        ⚡ {u.banStrike} strike{u.banStrike !== 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-10 py-8 text-right">
                     <div className="flex items-center justify-end gap-3">
                        <button onClick={() => window.open(`/profile/${u.id}`)} className="p-3 bg-white/5 text-slate-400 rounded-xl hover:text-white hover:bg-white/10 transition-all">
                           <Eye size={18} />
                        </button>
                        {u.status === 'ACTIVE' && (
                          <button onClick={() => setBanModal(u)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                             <UserX size={18} />
                          </button>
                        )}
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
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-slate-900 border border-white/10 p-12 rounded-[3rem] w-full max-w-lg shadow-2xl space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-red-500 uppercase tracking-tighter italic">Restrict Node</h3>
                <p className="text-xs text-slate-400 mb-2">User: <span className="font-bold text-white">{banModal.name}</span></p>
                <div className="flex gap-2 items-center mb-6">
                  <span className="text-xs text-slate-400">Current strikes:</span>
                  {[1,2,3].map(s => (
                    <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      (banModal.banStrike || 0) >= s ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-500'
                    }`}>{s}</div>
                  ))}
                  {(banModal.banStrike || 0) >= 3 && (
                    <span className="text-[10px] text-red-400 font-bold ml-1">⚠️ Next ban = PERMANENT</span>
                  )}
                </div>
              </div>
              
              <form onSubmit={e => {
                e.preventDefault();
                const duration = parseInt((e.target as any).duration.value);
                const reason = (e.target as any).reason.value;
                handleBan(banModal.id, duration, reason);
              }} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Suspension Duration</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="cursor-pointer">
                      <input type="radio" name="duration" value={(banModal.banStrike || 0) === 0 ? 1 : banModal.banStrike === 1 ? 3 : banModal.banStrike === 2 ? 7 : -1} defaultChecked className="peer hidden" />
                      <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 text-center transition-all peer-checked:bg-orange-500 peer-checked:text-white h-full flex flex-col justify-center">
                         <div className="text-[10px] font-black uppercase tracking-widest">
                           Next Strike ({(banModal.banStrike || 0) === 0 ? "1 Day" : banModal.banStrike === 1 ? "3 Days" : banModal.banStrike === 2 ? "7 Days" : "Permanent"})
                         </div>
                         <div className="text-[8px] font-bold opacity-60 uppercase tracking-tighter mt-1">Automatic Progression</div>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" name="duration" value="-1" className="peer hidden" />
                      <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 text-center transition-all peer-checked:bg-red-900 peer-checked:text-white h-full flex flex-col justify-center">
                         <div className="text-[10px] font-black uppercase tracking-widest">Permanent Ban</div>
                         <div className="text-[8px] font-bold opacity-60 uppercase tracking-tighter mt-1">Override & Ban Forever</div>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Protocol Violation Reason</label>
                  <input required type="text" name="reason" placeholder="Enter formal reason..." className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500/50 transition-all" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setBanModal(null)} className="flex-1 bg-slate-950 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 border border-white/5">Cancel</button>
                  <button type="submit" className="flex-[2] bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-500 transition-all">Execute Restriction</button>
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
    "Extracting Perceptual Hash...",
    "Computing Hamming Distance...",
    "Thresholding 16-bit blocks...",
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
    formData.append("images", file);

    try {
      const res = await api.post("/admin/scan", formData, { headers: getHeaders() });
      setMatchResult(res.data);
    } catch (err: any) {
      toast.error("Scan Failed");
    } finally { 
       clearInterval(interval);
       setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
      <div className="bg-slate-900/50 rounded-[3rem] border border-white/5 p-16 backdrop-blur-xl text-center space-y-12">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
            Advanced Signal Trace
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Signal Intelligence</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Verify network integrity using pHash technology</p>
        </header>

        {!matchResult ? (
          <div className="max-w-md mx-auto space-y-8">
            <label className="block bg-slate-950 border-2 border-dashed border-white/5 hover:border-green-500/50 p-20 rounded-[2.5rem] cursor-pointer group transition-all">
              <input type="file" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if(f) { setFile(f); setPreview(URL.createObjectURL(f)); }
              }} />
              {preview ? (
                <img src={preview} className="w-full aspect-square object-cover rounded-3xl shadow-2xl" />
              ) : (
                <div className="space-y-6">
                   <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto border border-white/5 group-hover:bg-green-500 transition-all duration-500">
                      <ImageIcon size={32} className="text-slate-500 group-hover:text-slate-950" />
                   </div>
                   <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest group-hover:text-white transition-colors">Inject Image Signal</p>
                </div>
              )}
            </label>
            
            <button 
              disabled={!file || loading} 
              onClick={scanNetwork} 
              className="w-full h-16 bg-green-500 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-400 transition-all active:scale-95 disabled:opacity-20"
            >
              {loading ? steps[currentStep] : "Initiate Global Trace"}
            </button>
          </div>
        ) : (
          <div className="space-y-10 w-full text-left">
             <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-64 shrink-0">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Source Signal</p>
                   <img src={preview!} className="w-full aspect-square object-cover rounded-2xl shadow-xl border border-white/5" />
                </div>
                <div className="flex-1 w-full bg-slate-950 p-8 rounded-3xl border border-white/5 flex flex-col justify-center">
                   <div className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">
                     {matchResult.matchCount} Matches Found
                   </div>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Across global network</p>
                   {matchResult.matchCount > 0 && (
                     <button 
                        onClick={async () => {
                          if(!confirm("CRITICAL: This will permanently delete ALL matching images across the platform. Proceed?")) return;
                          try {
                            const res = await api.delete(`/admin/delete/${matchResult.allMatches[0].postId}`, { headers: getHeaders() });
                            toast.success(`Nuked ${res.data.count} identical images from the network!`);
                            setMatchResult(null);
                            setPreview(null);
                            setFile(null);
                          } catch(err) {
                            toast.error("Wipe failed.");
                          }
                        }}
                        className="mt-6 px-6 py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-500 shadow-xl shadow-red-500/20 transition-all self-start flex items-center gap-2"
                     >
                        <Trash2 size={16} /> Nuke Entire Match Network
                     </button>
                   )}
                </div>
             </div>

             {matchResult.matchCount > 0 && (
               <div className="space-y-6 pt-6 border-t border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Identified Clones</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {matchResult.allMatches.map((m: any, idx: number) => (
                        <div key={idx} className="relative group rounded-2xl overflow-hidden border border-white/10 aspect-square">
                           <img src={m.previewUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
                           <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
                              <div className="text-green-500 font-black text-xs">{m.similarity} Match</div>
                              <div className="text-[8px] text-white/50 uppercase tracking-widest">By: {m.user}</div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
             )}

             <button onClick={() => { setMatchResult(null); setPreview(null); setFile(null); }} className="w-full py-6 bg-slate-950 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors border border-white/5">
                Scan New Signal
             </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NetworkSignals() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = () => {
    api.get("/admin/posts", { headers: getHeaders() })
      .then(res => { setPosts(res.data); setLoading(false); })
      .catch(() => { toast.error("Posts Load Failure"); setLoading(false); });
  };

  useEffect(() => { fetchPosts(); }, []);

  const deletePost = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this post?")) return;
    try {
      await api.delete(`/admin/posts/${id}`, { headers: getHeaders() });
      toast.success("Post deleted");
      fetchPosts();
    } catch {
      toast.error("Failed to delete post");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-slate-900/50 rounded-[3rem] border border-white/5 shadow-sm overflow-hidden backdrop-blur-xl">
        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-black text-xl tracking-tighter uppercase italic flex items-center gap-4">
              <Database className="text-green-500" size={24} />
              Network Signals (Posts)
            </h3>
            <div className="text-[10px] font-black text-green-500 bg-green-500/10 px-6 py-2 rounded-full border border-green-500/20 uppercase tracking-widest">
              {posts.length} Active Posts
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-500 uppercase text-[9px] font-black tracking-[0.3em]">
              <tr>
                <th className="px-10 py-6">Image</th>
                <th className="px-10 py-6">Caption</th>
                <th className="px-10 py-6">Author</th>
                <th className="px-10 py-6">Metrics</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-10 py-4">
                     <img src={p.imageUrl} alt="post" className="w-16 h-16 object-cover rounded-xl border border-white/10 group-hover:border-green-500/50 transition-all" />
                  </td>
                  <td className="px-10 py-4 text-slate-300 max-w-xs truncate">{p.caption || "No caption"}</td>
                  <td className="px-10 py-4 font-bold">{p.user?.name || "Unknown"}</td>
                  <td className="px-10 py-4 text-slate-400 text-xs">
                     {p._count?.likes || 0} Likes · {p._count?.comments || 0} Comments
                  </td>
                  <td className="px-10 py-4 text-right">
                     <button onClick={() => deletePost(p.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                        <Trash2 size={18} />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function FlaggedContent() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banModal, setBanModal] = useState<any>(null);

  const fetchFlags = () => {
    api.get("/admin/flags", { headers: getHeaders() })
      .then(res => { setFlags(res.data); setLoading(false); })
      .catch(() => { toast.error("Report Load Failure"); setLoading(false); });
  };

  useEffect(() => { fetchFlags(); }, []);

  const resolveFlag = async (id: number, action: "KEEP" | "WIPE") => {
    try {
      await api.post(`/admin/flags/${id}/resolve`, { action }, { headers: getHeaders() });
      toast.success("Incident Resolved");
      fetchFlags();
    } catch {
      toast.error("Resolution Failed");
    }
  };

  const handleBan = async (id: number, durationDays: number, reason: string) => {
    try {
      const res = await api.post(`/admin/users/${id}/ban`, { durationDays, reason }, { headers: getHeaders() });
      toast.success(res.data.message || "User restricted successfully.");
      setBanModal(null);
      fetchFlags();
    } catch {
      toast.error("Restriction failed.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-4">
           <Flag className="text-red-500" size={24} />
           Security Queue
         </h2>
         <div className="text-[10px] font-black text-red-500 bg-red-500/10 px-6 py-2 rounded-full border border-red-500/20 uppercase tracking-widest">
           {flags.length} Critical Incidents
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {flags.map((flag) => (
          <motion.div layout key={flag.id} className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-xl flex flex-col group hover:border-red-500/30 transition-all">
            <div className="relative aspect-video bg-slate-950 overflow-hidden">
               {flag.post ? (
                  <img src={flag.post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700 font-black uppercase text-[10px]">Data Purged</div>
               )}
               {flag.priority === "HIGH" && <div className="absolute top-4 left-4 px-3 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">Priority High</div>}
            </div>
            
            <div className="p-8 space-y-6 flex-1 flex flex-col">
               <div className="space-y-2">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Violation: {flag.reason}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic">"{flag.post?.caption || "No Context"}"</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-2">Author: {flag.user?.name || "Unknown"}</p>
               </div>

               <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => resolveFlag(flag.id, "KEEP")} className="py-3 bg-slate-950 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest border border-white/5 hover:text-white transition-all">Dismiss</button>
                    <button onClick={() => resolveFlag(flag.id, "WIPE")} className="py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-500 transition-all">Nuke Signal</button>
                  </div>
                  {flag.user && (
                    <button onClick={() => setBanModal(flag.user)} className="py-3 bg-orange-500/10 text-orange-500 rounded-xl font-black text-[9px] uppercase tracking-widest border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all w-full flex justify-center items-center gap-2">
                      <UserX size={14} /> Restrict User
                    </button>
                  )}
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {banModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.95, opacity: 0 }}
               className="bg-slate-900 border border-white/10 p-12 rounded-[3rem] w-full max-w-lg shadow-2xl space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-red-500 uppercase tracking-tighter italic">Restrict Node</h3>
                <p className="text-xs text-slate-400 mb-2">User: <span className="font-bold text-white">{banModal.name}</span></p>
              </div>
              
              <form onSubmit={e => {
                e.preventDefault();
                const duration = parseInt((e.target as any).duration.value);
                const reason = (e.target as any).reason.value;
                handleBan(banModal.id, duration, reason);
              }} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Suspension Duration</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="cursor-pointer">
                      <input type="radio" name="duration" value={(banModal.banStrike || 0) === 0 ? 1 : banModal.banStrike === 1 ? 3 : banModal.banStrike === 2 ? 7 : -1} defaultChecked className="peer hidden" />
                      <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 text-center transition-all peer-checked:bg-orange-500 peer-checked:text-white h-full flex flex-col justify-center">
                         <div className="text-[10px] font-black uppercase tracking-widest">
                           Next Strike ({(banModal.banStrike || 0) === 0 ? "1 Day" : banModal.banStrike === 1 ? "3 Days" : banModal.banStrike === 2 ? "7 Days" : "Permanent"})
                         </div>
                         <div className="text-[8px] font-bold opacity-60 uppercase tracking-tighter mt-1">Automatic Progression</div>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" name="duration" value="-1" className="peer hidden" />
                      <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 text-center transition-all peer-checked:bg-red-900 peer-checked:text-white h-full flex flex-col justify-center">
                         <div className="text-[10px] font-black uppercase tracking-widest">Permanent Ban</div>
                         <div className="text-[8px] font-bold opacity-60 uppercase tracking-tighter mt-1">Override & Ban Forever</div>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Protocol Violation Reason</label>
                  <input required type="text" name="reason" placeholder="Enter formal reason..." className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm outline-none focus:border-red-500/50 transition-all" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setBanModal(null)} className="flex-1 bg-slate-950 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 border border-white/5">Cancel</button>
                  <button type="submit" className="flex-[2] bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-500 transition-all">Execute Restriction</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SystemPulse() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get("/admin/logs", { headers: getHeaders() }).then(res => setLogs(res.data)).catch();
  }, []);

  return (
    <div className="bg-slate-900/50 rounded-[3rem] border border-white/5 backdrop-blur-xl overflow-hidden">
       <div className="px-10 py-8 border-b border-white/5 bg-slate-950/50">
          <h3 className="font-black text-xl uppercase tracking-tighter italic flex items-center gap-4">
             <List className="text-green-500" size={24} />
             Audit Intelligence
          </h3>
       </div>
       <div className="p-8 space-y-4">
          {logs.map((log: any) => (
             <div key={log.id} className="flex items-start gap-6 p-6 bg-slate-950 rounded-3xl border border-white/5 hover:border-green-500/20 transition-all group">
                <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 group-hover:bg-green-500/10 group-hover:border-green-500/30 transition-all">
                   <Zap size={20} className="text-slate-500 group-hover:text-green-500" />
                </div>
                <div className="flex-1 space-y-2">
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">{log.actionType}</span>
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{new Date(log.createdAt).toLocaleString()}</span>
                   </div>
                   <p className="text-sm text-slate-400 font-medium">{log.details}</p>
                   <div className="text-[8px] font-black text-green-500/40 uppercase tracking-[0.2em]">Auth: Admin_{log.adminName}</div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}
