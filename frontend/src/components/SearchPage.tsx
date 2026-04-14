import React, { useState } from "react";
import axios from "axios";
import { 
  Search, 
  Image as ImageIcon, 
  CheckCircle2, 
  ShieldAlert 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Post } from "../types";
import OptimizedImage from "./common/OptimizedImage";

export default function SearchPage() {
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
        <h2 className="text-6xl font-black tracking-tighter text-slate-900 uppercase">Image Search</h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">Find if an image has been posted before.</p>
        
        <div className="pt-8">
          <label className="relative group cursor-pointer inline-block overflow-hidden rounded-[2.5rem] bg-slate-900 px-12 py-6 shadow-xl">
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <div className="relative z-10 flex items-center gap-4 text-white font-black uppercase text-sm tracking-[0.2em]">
              <ImageIcon size={24} />
              {loading ? analyzingText : "SEARCH WITH IMAGE"}
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
                    <OptimizedImage 
                      src={post.imageUrl || ""} 
                      width={600} 
                      className="w-full h-full group-hover/res:scale-105 transition-transform duration-700" 
                    />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover/res:opacity-100 transition-opacity" />
                   <div className="absolute bottom-6 left-6 right-6 translate-y-4 group-hover/res:translate-y-0 opacity-0 group-hover/res:opacity-100 transition-all">
                      <div className="flex items-center gap-3">
                        <OptimizedImage 
                          src={post.user.avatar} 
                          width={50} 
                          className="w-8 h-8 rounded-full ring-2 ring-emerald-500" 
                        />
                        <div className="font-black text-white text-xs tracking-widest">@{post.user.name}</div>
                      </div>
                   </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <CheckCircle2 size={12} /> FOUND A MATCH
                    </div>
                    <div className="text-[10px] text-slate-300 font-black">99% MATCH</div>
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
