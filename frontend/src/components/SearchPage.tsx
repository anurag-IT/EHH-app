import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Search, 
  Image as ImageIcon, 
  CheckCircle2, 
  ShieldAlert,
  Users,
  Grid,
  X,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Post, User } from "../types";
import OptimizedImage from "./common/OptimizedImage";
import api from "../lib/api";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"people" | "signals">("signals");
  const [userResults, setUserResults] = useState<User[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [analyzingText, setAnalyzingText] = useState("");
  const [showImageSearch, setShowImageSearch] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setUserResults([]);
      setPostResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [usersRes, postsRes] = await Promise.all([
          api.get(`/api/users/search?q=${query}`),
          api.get(`/api/posts/search?q=${query}`)
        ]);
        setUserResults(usersRes.data);
        setPostResults(postsRes.data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageSearchLoading(true);
    
    const steps = ["Hashing Asset...", "Global Trace Initiated...", "Scanning Buffers...", "Cross-referencing pHash..."];
    steps.forEach((s, i) => setTimeout(() => setAnalyzingText(s), i * 800));

    const formData = new FormData();
    formData.append("image", f);

    try {
      const res = await api.post("/api/posts/search", formData);
      setPostResults(res.data);
      setActiveTab("signals");
      setShowImageSearch(false);
    } catch (err) {
      alert("System scan failed");
    } finally {
      setTimeout(() => setImageSearchLoading(false), steps.length * 800);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Search Bar Section */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <Search size={20} className={loading ? "text-green-500 animate-pulse" : "text-slate-500"} />
        </div>
        <input 
          type="text"
          placeholder="Search people or signals..."
          className="w-full bg-slate-800 border-none rounded-2xl py-5 pl-14 pr-32 text-sm font-bold text-white placeholder:text-slate-600 focus:ring-2 focus:ring-green-500 shadow-xl transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="absolute right-3 inset-y-2 flex items-center gap-2">
           {query && (
             <button onClick={() => setQuery("")} className="p-2 text-slate-500 hover:text-white">
                <X size={18} />
             </button>
           )}
           <button 
             onClick={() => setShowImageSearch(true)}
             className="bg-slate-700 p-2.5 rounded-xl text-slate-300 hover:text-green-500 transition-colors"
           >
             <ImageIcon size={20} />
           </button>
        </div>
      </div>

      {/* Tabs */}
      {!loading && (query || postResults.length > 0) && (
        <div className="flex items-center gap-8 border-b border-slate-800 mb-8 px-2 font-black text-[10px] uppercase tracking-[0.2em]">
          <button 
            onClick={() => setActiveTab("signals")}
            className={`pb-4 flex items-center gap-2 transition-all ${activeTab === 'signals' ? 'border-b-2 border-white text-white' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <Grid size={14} /> Signals
          </button>
          <button 
            onClick={() => setActiveTab("people")}
            className={`pb-4 flex items-center gap-2 transition-all ${activeTab === 'people' ? 'border-b-2 border-white text-white' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <Users size={14} /> People
          </button>
        </div>
      )}

      {/* Results Container */}
      <div className="min-h-[40vh]">
        {loading ? (
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="aspect-square bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeTab === "signals" ? (
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {postResults.map((post) => (
              <motion.div 
                key={post.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: post.userId }))}
                className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-slate-800"
              >
                <OptimizedImage 
                  src={post.imageUrl || ""} 
                  width={400} 
                  className="w-full h-full group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                   <div className="flex items-center gap-1 font-bold"><ShieldAlert size={16} /></div>
                </div>
              </motion.div>
            ))}
            {!loading && query && postResults.length === 0 && (
              <div className="col-span-3 py-20 text-center space-y-4 opacity-30">
                 <Search size={48} className="mx-auto" />
                 <p className="text-xs font-black uppercase tracking-widest">No matching signals found</p>
              </div>
            )}
            {!query && postResults.length === 0 && (
              <div className="col-span-3 py-20 text-center space-y-6">
                 <h3 className="text-2xl font-black text-white/10 uppercase tracking-tighter italic">Explore the Gaia Network</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-20 filter grayscale">
                      {/* Fake background items */}
                      {Array(8).fill(0).map((_, i) => (<div key={i} className="aspect-square bg-slate-800 rounded-3xl" />))}
                   </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {userResults.map((user) => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                   window.dispatchEvent(new CustomEvent('open-profile', { detail: user.id }));
                }}
                className="flex items-center justify-between p-4 bg-slate-800/20 hover:bg-slate-800 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-700"
              >
                <div className="flex items-center gap-4">
                   <OptimizedImage src={user.avatar || ""} width={100} className="w-14 h-14 rounded-full border border-slate-700" />
                   <div>
                      <div className="font-extrabold text-white flex items-center gap-1.5 leading-none">
                        {user.name} <CheckCircle2 size={12} className="text-blue-500 fill-blue-500/10" />
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{user.uniqueId}</div>
                   </div>
                </div>
                <ArrowRight size={20} className="text-slate-600" />
              </motion.div>
            ))}
            {!loading && query && userResults.length === 0 && (
              <div className="py-20 text-center space-y-4 opacity-30">
                 <Users size={48} className="mx-auto" />
                 <p className="text-xs font-black uppercase tracking-widest">No users matching "{query}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Search Modal (Trace Asset) */}
      <AnimatePresence>
        {showImageSearch && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl z-[300] flex items-center justify-center p-6">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-slate-800 border border-slate-700 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl overflow-hidden relative"
             >
                {imageSearchLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-8">
                     <div className="w-32 h-32 relative">
                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full" />
                        <div className="absolute inset-0 border-t-4 border-green-500 rounded-full animate-spin" />
                     </div>
                     <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.4em] animate-pulse">{analyzingText}</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Trace Asset</h3>
                       <button onClick={() => setShowImageSearch(false)} className="bg-slate-700 p-2 rounded-xl text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Upload a signal package to cross-reference perceptual signatures across the global Gaia network.</p>
                    
                    <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-700 rounded-[2.5rem] bg-slate-900/50 hover:bg-slate-900 transition-all cursor-pointer group">
                       <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon size={48} className="text-slate-600 group-hover:text-green-500 transition-colors mb-4" />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Signal File</p>
                       </div>
                       <input type="file" className="hidden" onChange={handleImageSearch} />
                    </label>

                    <button 
                      onClick={() => setShowImageSearch(false)}
                      className="w-full py-5 bg-slate-700 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-600 transition-all"
                    >
                      Return to Interface
                    </button>
                  </div>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

