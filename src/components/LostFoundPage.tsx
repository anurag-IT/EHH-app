import React, { useState } from "react";
import axios from "axios";
import { 
  Send, 
  ShieldAlert, 
  CheckCircle2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function LostFoundPage() {
  const [uniqueId, setUniqueId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const userStr = localStorage.getItem("social_user");
  const isBanned = userStr ? JSON.parse(userStr).status !== "ACTIVE" : true;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBanned) return;
    setLoading(true);
    try {
      const user = JSON.parse(userStr || "{}");
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
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Anonymous Signal</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Transmit encrypted payload using unique identifier.</p>
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
                placeholder="Write your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300 outline-none h-48 resize-none font-medium leading-relaxed transition-all shadow-sm"
              />
            </div>
            
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                   <CheckCircle2 size={18} />
                   <span className="text-xs font-black uppercase tracking-widest">Signal transmitted successfully.</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              disabled={loading || !uniqueId || !message}
              className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:bg-slate-800 disabled:opacity-20 transition-all active:scale-95"
            >
              {loading ? "TRANSMITTING..." : "SEND SIGNAL"}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
