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

interface UploadPageProps {
  onComplete: () => void;
  userId: number;
}

export default function UploadPage({ onComplete, userId }: UploadPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const userStr = localStorage.getItem("social_user");
  const isBanned = userStr ? JSON.parse(userStr).status !== "ACTIVE" : true;

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

      await api.post("/api/posts", formData);
      onComplete();
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
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
             {previews.length > 0 ? (
               <>
                 <motion.img 
                   key={activeIndex}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   src={previews[activeIndex]} 
                   className="w-full h-full object-contain" 
                 />
                 {previews.length > 1 && (
                   <>
                     <button 
                       onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                       disabled={activeIndex === 0}
                       className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 disabled:opacity-0 transition-all"
                     >
                       <ChevronLeft size={24} />
                     </button>
                     <button 
                       onClick={() => setActiveIndex(prev => Math.min(previews.length - 1, prev + 1))}
                       disabled={activeIndex === previews.length - 1}
                       className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 disabled:opacity-0 transition-all"
                     >
                       <ChevronRight size={24} />
                     </button>
                   </>
                 )}
               </>
             ) : (
               <div 
                 className="flex flex-col items-center justify-center gap-4 cursor-pointer"
                 onClick={() => document.getElementById("multi-upload")?.click()}
               >
                 <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-500 hover:text-green-500 hover:bg-slate-700 transition-all">
                    <ImageIcon size={40} />
                 </div>
                 <p className="font-bold text-slate-500 uppercase text-xs tracking-widest">Select Signal Assets (Max 20)</p>
               </div>
             )}
          </div>

          {/* Thumbnail Strip */}
          {previews.length > 0 && (
            <div className="h-24 bg-slate-900/50 border-t border-slate-800 p-3 flex gap-3 overflow-x-auto scrollbar-hide">
               {previews.map((p, i) => (
                 <div key={i} className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${activeIndex === i ? 'border-green-500 scale-105' : 'border-transparent'}`}>
                    <img src={p} className="w-full h-full object-cover" onClick={() => setActiveIndex(i)} />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute top-0 right-0 p-0.5 bg-black/50 text-white hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                 </div>
               ))}
               {previews.length < 20 && (
                 <button 
                   onClick={() => document.getElementById("multi-upload")?.click()}
                   className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-700 hover:text-green-500 hover:border-green-500 transition-all"
                 >
                   <Plus size={20} />
                 </button>
               )}
            </div>
          )}
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

