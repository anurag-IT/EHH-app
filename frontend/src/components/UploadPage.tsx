import React, { useState, useCallback } from "react";
import api from "../lib/api";
import { 
  Plus, 
  MapPin, 
  ShieldAlert,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { User, Post } from "../types";

interface UploadPageProps {
  onComplete: (newPost?: Post) => void;
  userId: number;
}

export default function UploadPage({ onComplete, userId }: UploadPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const userStr = localStorage.getItem("ehh_user");
  const isBanned = userStr ? (JSON.parse(userStr).status === "BANNED" || JSON.parse(userStr).status === "PERMANENT_BAN") : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 20) {
      alert("Maximum 20 images allowed.");
      return;
    }

    const newFiles = [...files, ...selectedFiles];
    const newPreviews = [...previews, ...selectedFiles.map(f => URL.createObjectURL(f))];
    
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (activeIndex >= newFiles.length) {
      setActiveIndex(Math.max(0, newFiles.length - 1));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || isBanned) return;
    setLoading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append("images", file);
      });
      formData.append("userId", userId.toString());
      formData.append("caption", caption);
      formData.append("location", location);

      const res = await api.post("/api/posts", formData);
      onComplete(res.data.post || res.data);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Upload failed.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto py-8 px-4 h-full">
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[700px] max-h-[85vh]">
        
        {/* Left Side: Media Preview */}
        <div className="flex-1 bg-black relative group flex flex-col border-r border-slate-800">
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black/20">
             {previews.length > 0 ? (
               <div className="w-full h-full p-4 overflow-y-auto scrollbar-hide">
                 {/* Dynamic Grid Preview (Facebook-like) */}
                 <div className={`grid gap-1 w-full h-full min-h-[400px] ${
                   previews.length === 1 ? 'grid-cols-1' :
                   previews.length === 2 ? 'grid-cols-2' :
                   previews.length === 3 ? 'grid-cols-2' :
                   'grid-cols-2'
                 }`}>
                   {previews.slice(0, 4).map((p, i) => {
                     let colSpan = "col-span-1";
                     let rowSpan = "row-span-1";
                     
                     if (previews.length === 3 && i === 0) {
                        colSpan = "col-span-1";
                        rowSpan = "row-span-2";
                     }
                     if (previews.length === 1) {
                        colSpan = "col-span-1";
                        rowSpan = "row-span-1";
                     }

                     return (
                       <div key={i} className={`relative group/item ${colSpan} ${rowSpan} rounded-lg overflow-hidden border border-white/10 bg-slate-800`}>
                          <img src={p} className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-500"
                          >
                            <X size={14} />
                          </button>
                          {i === 3 && previews.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                              <span className="text-white font-black text-2xl">+{previews.length - 4}</span>
                            </div>
                          )}
                       </div>
                     );
                   })}
                 </div>

                 {/* Thumbnail Selection List for all images */}
                 <div className="mt-6 grid grid-cols-5 gap-2 pb-10">
                    {previews.map((p, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-800 hover:border-green-500 transition-all">
                        <img src={p} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full hover:bg-red-500"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {previews.length < 20 && (
                      <button 
                        onClick={() => document.getElementById("multi-upload")?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-700 hover:text-green-500 hover:border-green-500 transition-all bg-slate-800/20"
                      >
                        <Plus size={20} />
                        <span className="text-[8px] font-black mt-1">ADD</span>
                      </button>
                    )}
                 </div>
               </div>
             ) : (
               <div 
                 className="flex flex-col items-center justify-center gap-4 cursor-pointer w-full h-full group"
                 onClick={() => document.getElementById("multi-upload")?.click()}
               >
                 <motion.div 
                   whileHover={{ scale: 1.05, rotate: 2 }}
                   className="w-24 h-24 bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-500 group-hover:text-green-500 group-hover:bg-slate-700 transition-all shadow-2xl border border-white/5"
                 >
                    <ImageIcon size={48} />
                 </motion.div>
                 <div className="text-center space-y-1">
                   <p className="font-black text-white uppercase text-sm tracking-[0.2em]">Select Visual Signals</p>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Multi-asset array support (Max 20)</p>
                 </div>
               </div>
             )}
          </div>

          <input id="multi-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Right Side: Details */}
        <div className="w-full md:w-[380px] bg-slate-900 flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700" />
             <span className="font-bold text-sm text-white uppercase tracking-tighter">New Transmission</span>
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-hide">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
              <textarea 
                placeholder="What's the frequency, Gaia?" 
                className="w-full h-32 bg-transparent border-none outline-none resize-none text-sm text-white placeholder:text-slate-700 font-medium"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location Metadata</label>
              <div className="flex items-center gap-2 px-3 py-3 bg-slate-800/50 rounded-xl border border-slate-800">
                <MapPin size={16} className="text-slate-600" />
                <input 
                  type="text" 
                  placeholder="Earth Grid Sector..." 
                  className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-700 w-full"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-800/50 space-y-2">
               <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Protocol Check</span>
               </div>
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">
                  Post will be cross-referenced across the Gaia pHash database to prevent duplicate or unauthorized signals.
               </p>
            </div>
          </div>

          <div className="p-6 border-t border-slate-800">
            <button 
              disabled={loading || files.length === 0 || isBanned}
              onClick={handleUpload}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95"
            >
              {loading ? "TRANSMITTING..." : "BROADCAST SIGNAL"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

