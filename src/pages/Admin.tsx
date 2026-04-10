import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  LayoutDashboard, Users, UserX, Image as ImageIcon, 
  Flag, List, Settings, LogOut, Trash2, ShieldAlert
} from "lucide-react";

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem("social_user") || "{}");
  return { "x-user-id": user.id };
};

export default function Admin({ onComplete }: { onComplete: () => void }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Dashboard hook
  useEffect(() => {
    if (activeTab === "dashboard") {
      axios.get("/admin/stats", { headers: getHeaders() })
        .then(res => {
          setStats(res.data);
          setError(null);
        })
        .catch(err => { 
          if(err.response?.status === 403) {
            setError("ACCESS DENIED: You must have an ADMIN role. Please update your role in the database.");
          } else {
            setError("Failed to load dashboard stats.");
          }
          console.error(err); 
        });
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-hidden bg-gray-900 text-white w-full shadow-2xl">
      <ToastContainer theme="dark" aria-label="Admin Notifications" />
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-gray-950 border-r border-gray-800 flex flex-col p-4 shadow-xl z-10 shrink-0">
        <div className="flex items-center gap-3 mb-8 px-2 py-2 text-green-500 font-black tracking-widest text-lg">
          <LayoutDashboard /> ADMIN PANEL
        </div>
        
        <nav className="flex-1 space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
          <SidebarButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <SidebarButton active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users size={18}/>} label="Users" />
          <SidebarButton active={activeTab === "banned"} onClick={() => setActiveTab("banned")} icon={<UserX size={18}/>} label="Posts" />
          <SidebarButton active={activeTab === "flags"} onClick={() => setActiveTab("flags")} icon={<Flag size={18}/>} label="Flagged Content" />
          <SidebarButton active={activeTab === "images"} onClick={() => setActiveTab("images")} icon={<ImageIcon size={18}/>} label="Image Control" />
          <SidebarButton active={activeTab === "logs"} onClick={() => setActiveTab("logs")} icon={<List size={18}/>} label="Logs" />
          <div className="pt-8 mt-8 border-t border-gray-800">
            <SidebarButton active={false} onClick={() => onComplete()} icon={<LogOut size={18}/>} label="Back to App" />
          </div>
        </nav>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto bg-gray-900 p-8 relative min-w-0">
        <AnimatePresence mode="wait">
          {error && activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="error">
               <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center h-64">
                 <ShieldAlert size={48} className="text-red-500 mb-4" />
                 <h2 className="text-2xl font-bold text-red-500 mb-2">Access Restricted</h2>
                 <p className="text-red-400 max-w-md">{error}</p>
                 <p className="text-sm text-gray-500 mt-4">Run <code>npx prisma studio</code> and change your user role to <strong>ADMIN</strong>.</p>
               </div>
            </motion.div>
          )}

          {activeTab === "dashboard" && stats && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="dashboard">
               <h2 className="text-3xl font-black mb-6">System Overview</h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <StatCard title="Total Users" value={stats.totalUsers} />
                 <StatCard title="Active Users" value={stats.activeUsers} color="text-green-500" />
                 <StatCard title="Banned Users" value={stats.bannedUsers} color="text-red-500" />
                 <StatCard title="Total Posts" value={stats.totalPosts} color="text-blue-500" />
               </div>
               
               <div className="h-64 bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-lg">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Users', value: stats.totalUsers },
                      { name: 'Active', value: stats.activeUsers },
                      { name: 'Banned', value: stats.bannedUsers },
                      { name: 'Posts', value: stats.totalPosts },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="name" stroke="#ccc" />
                      <YAxis stroke="#ccc" />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none" }} />
                      <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </motion.div>
          )}

          {activeTab === "users" && <UsersManager onComplete={onComplete} />}
          {activeTab === "banned" && <BannedHub />}
          {activeTab === "images" && <ImageControl onComplete={onComplete} />}
          {activeTab === "flags" && <FlaggedContent />}
          {activeTab === "logs" && <SystemLogs />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 ${active ? 'bg-green-500/10 text-green-500 font-bold shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 hover:border-green-500/50 transition-all shadow-md hover:shadow-2xl hover:-translate-y-2 transform duration-300">
      <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-3">{title}</div>
      <div className={`text-5xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function UsersManager({ onComplete }: { onComplete: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [banModal, setBanModal] = useState<any>(null);

  const fetchUsers = () => {
    axios.get("/admin/users", { headers: getHeaders() })
      .then(res => setUsers(res.data))
      .catch(() => toast.error("Failed to load users"));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (id: number, durationDays: number, reason: string) => {
    try {
      await axios.post(`/admin/users/${id}/ban`, { durationDays, reason }, { headers: getHeaders() });
      toast.success("User banned successfully");
      setBanModal(null);
      fetchUsers();
    } catch (err) {
      toast.error("Ban failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to PERMANENTLY DELETE this user and all their posts?")) return;
    try {
      await axios.delete(`/admin/users/${id}`, { headers: getHeaders() });
      toast.success("User deleted permanently");
      fetchUsers();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      <div className="bg-gray-800 rounded-2xl overflow-x-auto border border-gray-700">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email / ID</th>
              <th className="p-4">Posts</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-750">
                <td className="p-4 font-bold max-w-[150px] truncate">{u.name}</td>
                <td className="p-4 text-xs font-mono">{u.email}<br/>{u.uniqueId}</td>
                <td className="p-4">{u._count?.posts || 0}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${u.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                   {u.status === 'ACTIVE' && (
                     <button onClick={() => setBanModal(u)} className="bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-500 hover:text-white transition-all text-xs">Ban</button>
                   )}
                   <button onClick={() => handleDelete(u.id)} className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-3xl w-full max-w-md">
            <h3 className="text-xl font-bold text-red-500 mb-2">Ban User: {banModal.name}</h3>
            {banModal.banCount >= 3 && (
              <div className="bg-orange-500/20 border border-orange-500 text-orange-400 text-xs p-3 rounded-xl mb-4 font-bold">
                ⚠️ WARNING: This user has been banned {banModal.banCount} times before. Consider a permanent ban.
              </div>
            )}
            <form onSubmit={e => {
              e.preventDefault();
              const duration = parseInt((e.target as any).duration.value);
              const reason = (e.target as any).reason.value;
              handleBan(banModal.id, duration, reason);
            }} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-1">Duration</label>
                <select name="duration" className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white">
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="-1">Permanent</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold block mb-1">Reason</label>
                <input required type="text" name="reason" placeholder="Violation of TOS..." className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setBanModal(null)} className="flex-1 bg-gray-800 py-3 rounded-xl font-bold hover:bg-gray-700">Cancel</button>
                <button type="submit" className="flex-[2] bg-red-600 text-white font-bold rounded-xl hover:bg-red-500">Enforce Ban</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function BannedHub() {
  const [banned, setBanned] = useState<any[]>([]);

  const fetchBanned = () => {
    axios.get("/admin/users", { headers: getHeaders() })
      .then(res => setBanned(res.data.filter((u: any) => u.status !== 'ACTIVE')))
      .catch(() => toast.error("Failed to load users"));
  };

  useEffect(() => { fetchBanned(); }, []);

  const unban = async (id: number) => {
    try {
      await axios.post(`/admin/users/${id}/unban`, {}, { headers: getHeaders() });
      toast.success("User unbanned");
      fetchBanned();
    } catch {
      toast.error("Unban failed");
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-bold mb-6">Banned Users Hub</h2>
      <div className="grid gap-4">
        {banned.map(u => (
          <div key={u.id} className="bg-gray-800 border border-red-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="font-bold">{u.name} <span className="text-gray-500 text-xs ml-2">{u.uniqueId}</span></div>
              <div className="text-sm text-red-400 mt-1">Reason: {u.banReason || "Not specified"}</div>
              <div className="text-xs text-gray-500 font-mono mt-2">
                {u.banUntil ? `Until: ${new Date(u.banUntil).toLocaleString()}` : "PERMANENT BAN"}
              </div>
            </div>
            <button onClick={() => unban(u.id)} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-bold transition-all">Revoke Ban</button>
          </div>
        ))}
        {banned.length === 0 && <div className="text-gray-500">No banned users.</div>}
      </div>
    </motion.div>
  );
}

function ImageControl({ onComplete }: { onComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const scanNetwork = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post("/admin/find-image", formData, { headers: getHeaders() });
      if (res.data.matchCount === 0) toast.info("No matches found. Network clean.");
      else { setMatchResult(res.data); toast.warning(`Found ${res.data.matchCount} similar variants!`); }
    } catch {
      toast.error("Scan failed");
    } finally { setLoading(false); }
  }

  const deleteFamily = async () => {
    if (!confirm(`DANGER: Are you sure you want to permanently delete ${matchResult.matchCount} matched posts globally?`)) return;
    setLoading(true);
    try {
      await axios.delete(`/admin/delete/${matchResult.postId}`, { headers: getHeaders() });
      toast.success("Global deletion complete.");
      setMatchResult(null);
      setFile(null); setPreview(null);
      onComplete();
    } catch {
      toast.error("Deletion failed");
    } finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
      <h2 className="text-3xl font-black mb-6 text-center text-red-500">Image Grid Wipe</h2>
      
      {!matchResult ? (
        <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl text-center">
          <label className="block border-2 border-dashed border-gray-600 hover:border-gray-400 p-12 rounded-2xl mb-6 cursor-pointer overflow-hidden">
            <input type="file" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if(f) { setFile(f); setPreview(URL.createObjectURL(f)); }
            }} />
            {preview ? <img src={preview} className="max-h-48 mx-auto" /> : <div className="text-gray-400">Click to upload target image</div>}
          </label>
          <button disabled={!file || loading} onClick={scanNetwork} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold cursor-pointer hover:bg-red-500 disabled:opacity-50">
            {loading ? "Scanning..." : "Execute Global Deep Scan"}
          </button>
        </div>
      ) : (
        <div className="bg-red-950 border border-red-500/50 p-8 rounded-3xl text-center">
           <img src={matchResult.previewUrl} className="w-32 h-32 object-cover mx-auto rounded-xl mb-4 border-2 border-red-500" />
           <div className="text-5xl font-black text-red-500 mb-2">{matchResult.matchCount}</div>
           <div className="text-red-400 font-bold uppercase tracking-widest mb-8">Instances Found Across Network</div>
           
           <div className="flex gap-4">
             <button onClick={() => setMatchResult(null)} className="flex-1 bg-gray-800 py-4 rounded-xl font-bold">Cancel</button>
             <button onClick={deleteFamily} className="flex-[2] bg-red-600 flex items-center justify-center gap-2 py-4 rounded-xl font-bold hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
               <Trash2 size={20} /> Permanently Delete All
             </button>
           </div>
        </div>
      )}
    </motion.div>
  );
}

function SystemLogs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    axios.get("/admin/logs", { headers: getHeaders() }).then(res => setLogs(res.data)).catch();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-bold mb-6">Audit Logs</h2>
      <div className="space-y-3">
        {logs.map((log: any) => (
          <div key={log.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700/50 flex flex-col md:flex-row md:items-center gap-4">
             <div className="bg-gray-700 px-3 py-1 text-xs font-mono rounded text-blue-300 w-fit">{log.actionType}</div>
             <div className="flex-1">
               <div className="text-sm font-bold">{log.details}</div>
               <div className="text-xs text-gray-400 mt-1">Admin: {log.adminName} &bull; Target: {log.targetId}</div>
             </div>
             <div className="text-xs text-gray-500 font-mono">{new Date(log.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {logs.length === 0 && <div className="text-gray-500">No logs found.</div>}
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
      .catch(() => { toast.error("Failed to load flagged content"); setLoading(false); });
  };

  useEffect(() => { fetchFlags(); }, []);

  const resolveFlag = async (id: number, action: "KEEP" | "WIPE") => {
    try {
      await axios.post(`/admin/flags/${id}/resolve`, { action }, { headers: getHeaders() });
      toast.success(`Post ${action === "KEEP" ? "kept" : "wiped"} successfully`);
      fetchFlags();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Resolution failed");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-bold mb-6">Flagged Content Queue</h2>
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : flags.length === 0 ? (
        <div className="text-center p-12 border border-gray-800 rounded-3xl bg-gray-800/20 text-gray-400">
          <Flag size={48} className="mx-auto mb-4 opacity-50" />
          No flagged content currently awaiting review.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {flags.map((flag) => (
            <div key={flag.id} className="bg-gray-800 rounded-3xl overflow-hidden border border-gray-700/50 flex flex-col">
              <div className="relative h-48 bg-black">
                {flag.post ? (
                   <img src={`/uploads/${flag.post.imagePath}`} className="w-full h-full object-cover opacity-80 mix-blend-screen" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-500">Post Deleted</div>
                )}
                {flag.priority === "HIGH" && (
                  <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-widest rounded-lg">High Priority</div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="text-xs text-gray-400 mb-2 font-mono">Flagged by: {flag.user?.name || "System"} &bull; User ID: {flag.user?.uniqueId}</div>
                <div className="text-xl font-bold mb-2">{flag.reason}</div>
                <div className="text-sm mt-2 mb-4 italic text-gray-300">"{flag.post?.caption}"</div>
                
                <div className="mt-auto flex gap-3">
                  <button onClick={() => resolveFlag(flag.id, "KEEP")} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50" disabled={!flag.post}>IGNORE</button>
                  <button onClick={() => resolveFlag(flag.id, "WIPE")} className="flex-[2] py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-50" disabled={!flag.post}>DELETE POST</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
