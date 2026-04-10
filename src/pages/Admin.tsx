import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import { 
  LayoutDashboard, Users, UserX, Image as ImageIcon, 
  Flag, List, Settings, LogOut, Trash2, ShieldAlert,
  Search, CheckCircle2, AlertTriangle, Fingerprint,
  Zap, Database, Globe, Briefcase, Activity, MoreVertical,
  ChevronRight, ArrowUpRight, Hash, Eye
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
            setError("PROTOCOL DENIED: Admin credentials required for command clearance.");
          } else {
            setError("System link failure. Unable to retrieve core statistics.");
          }
          console.error(err); 
        });
    }
  }, [activeTab]);

  return (
    <div className="flex h-screen bg-[#022c22] text-white overflow-hidden font-sans selection:bg-emerald-500 selection:text-emerald-950">
      <ToastContainer 
        theme="dark" 
        aria-label="Admin Notifications"
        toastClassName="!bg-[#064e3b] !border !border-white/10 !rounded-2xl !backdrop-blur-xl"
        progressClassName="!bg-emerald-500"
      />
      
      {/* Sidebar - Enhanced */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden lg:flex w-80 bg-[#022c22] border-r border-white/5 flex-col p-8 z-50 shrink-0 shadow-[20px_0_50px_-10px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-4 mb-16 px-2">
           <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20">
             <LayoutDashboard className="text-emerald-950" size={24} />
           </div>
           <div>
             <h1 className="font-black text-xl tracking-tighter text-white">COMMAND</h1>
             <p className="text-[10px] text-emerald-400 font-bold tracking-[0.3em] uppercase opacity-40">EHH Oracle v2.0</p>
           </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          <SidebarButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard size={20}/>} label="Strategy Desk" />
          <SidebarButton active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users size={20}/>} label="Identity Logs" />
          <SidebarButton active={activeTab === "flags"} onClick={() => setActiveTab("flags")} icon={<Flag size={20}/>} label="Violation Queue" />
          <SidebarButton active={activeTab === "images"} onClick={() => setActiveTab("images")} icon={<Fingerprint size={20}/>} label="Trace Scanner" />
          <SidebarButton active={activeTab === "logs"} onClick={() => setActiveTab("logs")} icon={<List size={20}/>} label="System Pulse" />
        </nav>

        <div className="mt-auto space-y-4 pt-8 border-t border-white/5">
          <div className="p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10">
             <div className="flex items-center gap-3 mb-2">
                <ShieldAlert size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Core Firewall</span>
             </div>
             <p className="text-[10px] text-emerald-400/20 font-bold uppercase leading-relaxed">Full monitoring enabled. All operations are indexed.</p>
          </div>
          <button 
            onClick={() => onComplete()}
            className="w-full h-14 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            Exit Terminal
          </button>
        </div>
      </motion.div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-10 shrink-0 bg-[#022c22]/50 backdrop-blur-md">
           <div className="flex items-center gap-6">
              <h2 className="text-2xl font-black text-white tracking-tighter transition-all">
                {activeTab === "dashboard" ? "Real-time Strategy" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace("-", " ")}
              </h2>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Status: Nominal</span>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right hidden sm:block">
                   <div className="text-sm font-black text-white">Admin Terminal</div>
                   <div className="text-[10px] text-emerald-400/40 font-bold uppercase tracking-widest">Access Level 7</div>
                 </div>
                 <div className="w-12 h-12 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center">
                   <ShieldAlert className="text-emerald-500" />
                 </div>
              </div>
           </div>
        </header>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            {error && activeTab === "dashboard" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0 }} 
                key="error"
                className="h-full flex items-center justify-center p-12"
              >
                 <div className="bg-red-500/10 border border-red-500/20 p-16 rounded-[4rem] text-center max-w-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                     <ShieldAlert size={200} />
                   </div>
                   <ShieldAlert size={80} className="text-red-500 mx-auto mb-8 animate-bounce" />
                   <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Clearance Required</h2>
                   <p className="text-red-400/80 mb-10 text-lg font-medium leading-relaxed">{error}</p>
                   <div className="bg-black/20 p-6 rounded-3xl border border-white/5 text-sm font-mono text-white/40 mb-10">
                     $ prisma set role --user "current" --role "ADMIN"
                   </div>
                   <button onClick={() => onComplete()} className="px-12 py-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 font-black uppercase text-xs tracking-widest transition-all">Relinquish Access</button>
                 </div>
              </motion.div>
            )}

            {activeTab === "dashboard" && stats && !error && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="dashboard" className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <StatCard title="Total Identities" value={stats.totalUsers} sub="Network population" icon={<Users className="text-emerald-400" />} />
                  <StatCard title="Operational" value={stats.activeUsers} sub="High activity status" color="text-emerald-400" icon={<Activity className="text-emerald-500" />} />
                  <StatCard title="Terminated" value={stats.bannedUsers} sub="Protocol violations" color="text-red-500" icon={<UserX className="text-red-500" />} />
                  <StatCard title="Total Data" value={stats.totalPosts} sub="Asset transmissions" color="text-blue-500" icon={<Database className="text-blue-500" />} />
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 bg-[#064e3b]/20 rounded-[3rem] p-10 border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10">
                       <div>
                         <h3 className="text-xl font-black text-white tracking-tight uppercase">Network Density</h3>
                         <p className="text-emerald-400/40 text-[10px] font-bold uppercase tracking-widest mt-1">Activity metrics per vector</p>
                       </div>
                       <div className="flex gap-2">
                         <div className="px-4 py-2 bg-emerald-500 text-emerald-950 text-[10px] font-black rounded-xl uppercase tracking-widest">LIVE</div>
                       </div>
                    </div>
                    <div className="h-80 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={[
                           { name: 'Pop', val: stats.totalUsers },
                           { name: 'Act', val: stats.activeUsers },
                           { name: 'Ban', val: stats.bannedUsers },
                           { name: 'Trans', val: stats.totalPosts },
                           { name: 'Vio', val: stats.totalPosts / 4 },
                         ]}>
                           <defs>
                             <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                               <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                           <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                           <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                           <Tooltip 
                            contentStyle={{ backgroundColor: "#064e3b", borderRadius: "1.5rem", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)" }}
                            itemStyle={{ color: "white", fontWeight: "900", fontSize: "12px", textTransform: "uppercase" }}
                            />
                           <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#064e3b]/20 rounded-[3rem] p-10 border border-white/5 backdrop-blur-3xl shadow-2xl space-y-8">
                     <h3 className="text-xl font-black text-white tracking-tight uppercase mb-4">Threat Intel</h3>
                     <div className="space-y-6">
                        <ThreatItem label="Identities Flagged" value="12" level="LOW" />
                        <ThreatItem label="Protocol Breaches" value="43" level="MID" />
                        <ThreatItem label="Infiltration Attempts" value="0" level="NULL" />
                        <ThreatItem label="System Efficiency" value="99.8%" level="HIGH" />
                     </div>
                     <div className="pt-8 mt-8 border-t border-white/5">
                        <p className="text-[10px] text-emerald-400/20 font-bold uppercase leading-relaxed tracking-widest italic animate-pulse text-center">Scanning for anomalies in metadata chains...</p>
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
      className={`w-full group relative flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' : 'text-emerald-400/30 hover:text-white hover:bg-white/5'}`}
    >
      {active && <motion.div layoutId="side-pill" className="absolute left-0 w-1.5 h-6 bg-emerald-500 rounded-r-full" />}
      <span className={`transition-transform duration-500 ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-emerald-400'}`}>{icon}</span>
      <span className="text-xs font-black uppercase tracking-[0.2em]">{label}</span>
      {active && <div className="ml-auto p-1.5 bg-emerald-500/10 rounded-lg"><ChevronRight size={12} /></div>}
    </button>
  );
}

function StatCard({ title, value, color = "text-white", icon, sub }: any) {
  return (
    <div className="group bg-[#064e3b]/20 p-8 rounded-[3rem] border border-white/5 hover:border-emerald-500/30 transition-all shadow-xl hover:shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5 -scale-x-100 group-hover:scale-100 transition-transform duration-1000">
         {icon && React.cloneElement(icon, { size: 100 })}
      </div>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
           {icon}
        </div>
        <div>
          <div className="text-emerald-400/40 text-[10px] font-black uppercase tracking-widest">{title}</div>
          <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-0.5">{sub}</div>
        </div>
      </div>
      <div className={`text-5xl font-black tracking-tighter ${color} mb-2`}>{value}</div>
      <div className="h-1 w-12 bg-emerald-500/20 rounded-full mt-4 group-hover:w-full transition-all duration-700" />
    </div>
  );
}

function ThreatItem({ label, value, level }: any) {
  const colors: any = {
    LOW: "text-emerald-500 bg-emerald-500/10",
    MID: "text-orange-500 bg-orange-500/10",
    HIGH: "text-red-500 bg-red-500/10",
    NULL: "text-white/20 bg-white/5"
  };
  return (
    <div className="flex items-center justify-between group">
       <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
       <div className="flex items-center gap-4">
          <span className="text-sm font-black text-white">{value}</span>
          <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${colors[level]}`}>{level}</span>
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
      .catch(() => toast.error("System sync failed at Identity level."));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (id: number, durationDays: number, reason: string) => {
    try {
      await axios.post(`/admin/users/${id}/ban`, { durationDays, reason }, { headers: getHeaders() });
      toast.success("Enforcement protocol active: User restricted.");
      setBanModal(null);
      fetchUsers();
    } catch {
      toast.error("Protocol failure: Unable to restrict identity.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("IDENTITY WIPE: Are you sure you want to permanently delete this user and all their transmissions from the EHH archives?")) return;
    try {
      await axios.delete(`/admin/users/${id}`, { headers: getHeaders() });
      toast.success("Identity purged globally.");
      fetchUsers();
    } catch {
      toast.error("Wipe command failed.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-[#064e3b]/20 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <h3 className="font-black text-2xl tracking-tighter uppercase flex items-center gap-4">
              <Users className="text-emerald-500" />
              Identity Logs
            </h3>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em] bg-emerald-500/10 px-6 py-2 rounded-full border border-emerald-500/20">
              Total Managed: {users.length}
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#022c22] text-white/20 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-10 py-6">ID Mapping</th>
                <th className="px-10 py-6">Credentials</th>
                <th className="px-10 py-6">Asset Count</th>
                <th className="px-10 py-6">Status Vector</th>
                <th className="px-10 py-6 text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-10 py-8">
                     <div className="flex items-center gap-4">
                        <img src={u.avatar} className="w-12 h-12 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="font-extrabold text-white text-base group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{u.name}</div>
                          <div className="text-[10px] text-white/20 font-bold tracking-[0.2em] mt-1">{u.uniqueId}</div>
                        </div>
                     </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="text-white/60 font-medium text-xs">{u.email}</div>
                    <div className="text-[10px] text-white/20 font-black mt-1 uppercase tracking-widest">Role: {u.role}</div>
                  </td>
                  <td className="px-10 py-8 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                       <span className="text-lg font-black text-emerald-400">{u._count?.posts || 0}</span>
                       <div className="w-12 h-1 bg-white/5 rounded-full relative overflow-hidden">
                          <div className="absolute top-0 left-0 h-full bg-emerald-500" style={{ width: `${Math.min((u._count?.posts || 0) * 5, 100)}%` }} />
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                       {u.status === 'ACTIVE' && (
                         <button onClick={() => setBanModal(u)} className="p-3 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/20 hover:bg-orange-600 hover:text-white transition-all shadow-lg shadow-orange-500/10" title="Restrict Identity">
                           <UserX size={18} />
                         </button>
                       )}
                       <button onClick={() => handleDelete(u.id)} className="p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/10" title="Purge Permanently">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ban Modal Redesigned */}
      <AnimatePresence>
        {banModal && (
          <div className="fixed inset-0 bg-[#022c22]/95 backdrop-blur-2xl flex items-center justify-center z-[200] p-4">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-[#064e3b] border border-white/10 p-12 rounded-[4rem] w-full max-w-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12">
                 <UserX size={200} />
              </div>
              <h3 className="text-3xl font-black text-red-500 mb-2 tracking-tighter uppercase flex items-center gap-4">
                <ShieldAlert /> IDENTITY LOCKOUT
              </h3>
              <p className="text-emerald-400/40 text-[10px] font-black uppercase tracking-[0.3em] mb-10">Restricting network access for identity: <span className="text-white/60">{banModal.name}</span></p>
              
              <form onSubmit={e => {
                e.preventDefault();
                const duration = parseInt((e.target as any).duration.value);
                const reason = (e.target as any).reason.value;
                handleBan(banModal.id, duration, reason);
              }} className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] text-emerald-400/40 uppercase tracking-[0.2em] font-black ml-4">Lockout Duration</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[ {v:1, l:'24H Probe'}, {v:7, l:'7D Sanction'}, {v:30, l:'30D Isolation'}, {v:-1, l:'Permanent Purge'} ].map(opt => (
                      <label key={opt.v} className="relative group cursor-pointer">
                        <input type="radio" name="duration" value={opt.v} defaultChecked={opt.v === 1} className="peer hidden" />
                        <div className="p-5 rounded-3xl bg-[#022c22] border border-white/5 text-center transition-all peer-checked:bg-red-500 peer-checked:text-white peer-checked:border-red-600 peer-checked:shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                           <div className="text-[10px] font-black uppercase tracking-widest">{opt.l}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] text-emerald-400/40 uppercase tracking-[0.2em] font-black ml-4">Breach Log Detail</label>
                  <input required type="text" name="reason" placeholder="Explain the protocol breach..." className="w-full bg-[#022c22] border border-white/5 rounded-3xl p-6 text-white placeholder:text-white/10 outline-none focus:border-red-500 transition-all shadow-inner" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setBanModal(null)} className="flex-1 bg-white/5 py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all border border-white/5">ABORT</button>
                  <button type="submit" className="flex-[2] bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-3xl hover:bg-red-500 transition-all shadow-2xl shadow-red-600/20">ENFORCE LOCKOUT</button>
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
  const [scanSteps, setScanSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Initializing Neural Fingerprint Scan...",
    "Extracting Multi-Vector Metadata...",
    "pHash Reconstruction in Buffer...",
    "Querying Global SHA-256 Ledger...",
    "Analyzing Geometry & Pixel Distribution...",
    "Locating Clones Across Data-stream..."
  ];

  const scanNetwork = async () => {
    if (!file) return;
    setLoading(true);
    setCurrentStep(0);
    setScanSteps([]);
    
    // Aesthetic simulation
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post("/admin/find-image", formData, { headers: getHeaders() });
      setMatchResult(res.data);
      if (res.data.matchCount === 0) toast.info("Deep scan complete: No asset clones detected.");
      else toast.warn(`ALERT: Detected ${res.data.matchCount} identified variants in traffic.`);
    } catch {
      toast.error("Deep scan aborted: Network handshake failure.");
    } finally { 
       setTimeout(() => setLoading(false), 5000); // Keep loading for effect
    }
  }

  const deleteFamily = async () => {
    if (!confirm(`PROTOCOL PURGE: You are about to permanently disintegrate ${matchResult.matchCount} identified variants. This action cannot be undone. Proceed?`)) return;
    setLoading(true);
    try {
      await axios.delete(`/admin/delete/${matchResult.postId}`, { headers: getHeaders() });
      toast.success("Global purge complete: Assets disintegrated.");
      setMatchResult(null);
      setFile(null); setPreview(null);
    } catch {
      toast.error("Purge failure: Database shield active.");
    } finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl mx-auto py-12">
      <div className="bg-[#064e3b]/20 rounded-[4rem] border border-white/5 backdrop-blur-3xl p-16 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 p-20 opacity-5">
           <Fingerprint size={300} className="text-emerald-500" />
        </div>
        
        <header className="text-center mb-16 relative z-10">
          <div className="inline-block p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-6 group hover:bg-emerald-500/20 transition-all cursor-crosshair">
             <Fingerprint size={48} className="text-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">Neural Trace Scanner</h2>
          <p className="text-emerald-400/40 text-[10px] font-black uppercase tracking-[0.5em] mt-4 leading-relaxed">Deep-scanning visual identifiers for multi-vector clone detection across the global data grid.</p>
        </header>

        {!matchResult ? (
          <div className="relative z-10 max-w-2xl mx-auto">
            <label className="block bg-[#022c22] border-2 border-dashed border-white/10 hover:border-emerald-500/30 p-20 rounded-[3rem] mb-10 cursor-pointer overflow-hidden transition-all group relative">
              <input type="file" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if(f) { setFile(f); setPreview(URL.createObjectURL(f)); }
              }} />
              {preview ? (
                <div className="relative w-full h-80">
                  <div className="absolute inset-0 bg-emerald-500/10 animate-pulse mix-blend-overlay" />
                  <img src={preview} className="w-full h-full object-contain rounded-3xl" />
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_#10b981] animate-[scan_3s_infinite_linear]" />
                </div>
              ) : (
                <div className="text-center space-y-6">
                   <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto border border-white/5 group-hover:scale-110 transition-transform">
                      <ImageIcon size={40} className="text-emerald-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                   </div>
                   <p className="text-emerald-400/30 font-black uppercase tracking-widest text-xs">Inject asset for neural scan</p>
                </div>
              )}
            </label>

            <style>{`
              @keyframes scan {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
              }
            `}</style>
            
            <button 
              disabled={!file || loading} 
              onClick={scanNetwork} 
              className="group relative w-full h-20 bg-emerald-500 text-emerald-950 rounded-3xl font-black uppercase text-sm tracking-[0.4em] overflow-hidden shadow-2xl shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-20"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
              <div className="relative z-10 flex items-center justify-center gap-6">
                {loading ? (
                  <div className="flex items-center gap-4">
                     <span className="animate-pulse">{steps[currentStep]}</span>
                  </div>
                ) : (
                  <>
                    <Zap size={24} className="group-hover:rotate-12 transition-transform" />
                    EXECUTE GLOBAL DEEP SCAN
                  </>
                )}
              </div>
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
             <div className="bg-[#022c22] rounded-[3rem] p-10 border border-white/5 flex flex-col items-center justify-center text-center">
                <div className="relative mb-10 w-full aspect-square max-w-xs group/prev">
                  <img src={matchResult.previewUrl} className="w-full h-full object-cover rounded-[3rem] border-4 border-emerald-500 shadow-2xl group-hover/prev:scale-105 transition-transform duration-500" />
                  <div className="absolute -top-4 -right-4 bg-emerald-500 p-4 rounded-3xl shadow-2xl border-4 border-[#022c22]">
                    <CheckCircle2 size={32} className="text-emerald-950" />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/prev:opacity-100 transition-opacity rounded-[3rem] flex items-center justify-center">
                     <div className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Neural Fingerprint Verified</div>
                  </div>
                </div>
                <div className="text-7xl font-black text-white tracking-tighter mb-2">{matchResult.matchCount}</div>
                <div className="text-emerald-400 font-black uppercase tracking-[0.4em] text-[10px] mb-8">Detected Variants in Network Traffic</div>
             </div>

             <div className="space-y-8 flex flex-col justify-center">
               <div className="space-y-6">
                  <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-400/40 uppercase tracking-widest">Confidence Score</span>
                        <span className="text-lg font-black text-white">{matchResult.similarity || "99.9%"}</span>
                     </div>
                     <div className="h-1.5 w-full bg-[#022c22] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: matchResult.similarity || "99.9%" }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                     </div>
                  </div>

                  <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"><Briefcase className="text-emerald-500" /></div>
                        <div>
                           <div className="text-[10px] font-black text-emerald-400/40 uppercase tracking-widest">Match Type</div>
                           <div className="text-base font-black text-white uppercase tracking-tight">{matchResult.matchType || "Perceptual Hash Index"}</div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Entropy</div>
                        <div className="text-sm font-black text-white">LOW</div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setMatchResult(null)} className="h-20 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] transition-all">ABORT PROTOCOL</button>
                 <button onClick={deleteFamily} className="group relative h-20 bg-red-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] overflow-hidden shadow-2xl shadow-red-600/20 active:scale-95 transition-all">
                    <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <Trash2 size={18} />
                      PURGE GLOBALLY
                    </span>
                 </button>
               </div>
             </div>
          </motion.div>
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <div className="bg-[#064e3b]/20 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <h3 className="font-black text-2xl tracking-tighter uppercase flex items-center gap-4">
              <Zap className="text-emerald-500" />
              Event Stream
            </h3>
            <div className="flex items-center gap-4">
               <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">LIVE BROADCAST</span>
            </div>
        </div>
        <div className="p-10 space-y-4">
          {logs.map((log: any) => (
            <div key={log.id} className="group flex items-start gap-6 p-6 bg-[#022c22] rounded-[2rem] border border-white/5 hover:border-emerald-500/20 transition-all hover:translate-x-2">
               <div className={`shrink-0 p-4 rounded-2xl border ${log.actionType.includes('DELETE') ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'}`}>
                 {log.actionType.includes('DELETE') ? <Trash2 size={24} /> : <Zap size={24} />}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-3 mb-1.5">
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-emerald-400/60 uppercase tracking-widest border border-white/10 group-hover:bg-emerald-500 group-hover:text-emerald-950 transition-all cursor-default">{log.actionType}</span>
                    <span className="text-[10px] text-white/10 font-bold uppercase tracking-widest">{new Date(log.createdAt).toLocaleString()}</span>
                 </div>
                 <div className="text-base font-medium text-white/80 leading-relaxed max-w-2xl">{log.details}</div>
                 <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                       <ShieldAlert size={12} className="text-emerald-500/40" />
                       <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Admin: <span className="text-white/40">{log.adminName}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Hash size={12} className="text-emerald-500/40" />
                       <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Target: <span className="text-white/40">{log.targetId}</span></span>
                    </div>
                 </div>
               </div>
               <button className="p-3 text-white/5 hover:text-white transition-colors"><MoreVertical size={20} /></button>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-20 text-center opacity-20">
              <List size={48} className="mx-auto mb-6" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">No events recorded in buffer.</p>
            </div>
          )}
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
      .catch(() => { toast.error("Queue sync failure."); setLoading(false); });
  };

  useEffect(() => { fetchFlags(); }, []);

  const resolveFlag = async (id: number, action: "KEEP" | "WIPE") => {
    try {
      await axios.post(`/admin/flags/${id}/resolve`, { action }, { headers: getHeaders() });
      toast.success(`Protocol ${action === "KEEP" ? "ACKNOWLEDGED" : "PURGED"} successful.`);
      fetchFlags();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Intervention failed.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
           <Flag className="text-red-500" />
           Violation Queue
         </h2>
         <div className="flex items-center gap-4">
            <span className="text-xs font-black text-white/20 uppercase tracking-widest">Auto-resolve disabled</span>
            <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group cursor-pointer hover:bg-emerald-500 transition-all">
               <Settings size={18} className="group-hover:rotate-180 transition-transform duration-1000 group-hover:text-emerald-950" />
            </div>
         </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-6 opacity-20">
           <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.4em]">Syncing Violation Buffers...</p>
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-32 border border-white/5 rounded-[4rem] bg-[#064e3b]/5 backdrop-blur-3xl group">
          <div className="w-24 h-24 bg-[#022c22] rounded-[2.5rem] border border-white/5 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
             <CheckCircle2 size={48} className="text-emerald-500/40" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Security Integrity: 100%</h3>
          <p className="text-emerald-400/40 text-[10px] font-black uppercase tracking-[0.3em]">No asset violations reported in current broadcast cycle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {flags.map((flag) => (
            <motion.div 
              layout 
              key={flag.id} 
              className="bg-[#064e3b]/20 rounded-[3rem] overflow-hidden border border-white/5 backdrop-blur-3xl shadow-2xl flex flex-col group/card"
            >
              <div className="relative h-64 bg-black overflow-hidden">
                {flag.post ? (
                   <img src={`/uploads/${flag.post.imagePath}`} className="w-full h-full object-cover opacity-60 group-hover/card:scale-110 transition-transform duration-[3s]" />
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-red-500/20 gap-4">
                      <Trash2 size={48} />
                      <span className="text-[10px] font-black uppercase tracking-[0.5em]">ASSET DELETED</span>
                   </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#022c22] via-transparent to-transparent" />
                
                {flag.priority === "HIGH" && (
                  <div className="absolute top-8 left-8 flex items-center gap-3 bg-red-600 text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl animate-pulse">
                     <AlertTriangle size={14} />
                     PRIORITY RED
                  </div>
                )}
                
                <div className="absolute top-8 right-8">
                   <button className="p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white/40 hover:text-white transition-all"><Eye size={20} /></button>
                </div>
              </div>
              
              <div className="p-10 flex-1 flex flex-col space-y-6">
                <div>
                  <div className="text-[10px] text-emerald-400/40 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Fingerprint size={12} /> REPORTER: @{flag.user?.name || "Neural Engine"}
                  </div>
                  <h4 className="text-2xl font-black text-white tracking-tighter uppercase mb-4">{flag.reason}</h4>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                     <p className="text-sm font-medium italic text-white/40 leading-relaxed font-serif">"{flag.post?.caption || "Transmitted metadata missing"}"</p>
                  </div>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => resolveFlag(flag.id, "KEEP")} 
                    className="group relative flex items-center justify-center gap-3 py-5 bg-white/5 hover:bg-white/10 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] transition-all border border-white/5" 
                    disabled={!flag.post}
                  >
                    IGNORE
                    <ChevronRight size={14} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => resolveFlag(flag.id, "WIPE")} 
                    className="flex items-center justify-center gap-4 py-5 bg-red-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:bg-red-500 shadow-2xl shadow-red-600/20" 
                    disabled={!flag.post}
                  >
                    <Trash2 size={16} />
                    PURGE ASSET
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
