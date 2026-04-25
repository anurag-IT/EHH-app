import React, { useState } from "react";
import api from "../lib/api";
import { 
  Plus, 
  MapPin, 
  ShieldAlert,
  X,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Post } from "../types";

interface UploadPageProps {
  onComplete: (newPost?: Post) => void;
  userId: number;
}

export default function UploadPage({ onComplete, userId }: UploadPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const userStr = localStorage.getItem("ehh_user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isBanned = user?.status === "BANNED" || user?.status === "PERMANENT_BAN";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 10) {
      alert("Maximum 10 images allowed for premium transmission.");
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
  };

  const handleUpload = async () => {
    if (files.length === 0 || isBanned) return;
    setLoading(true);
    
    try {
      const formData = new FormData();
      // Append ALL files to the 'images' key
      files.forEach(file => {
        formData.append("images", file);
      });
      formData.append("userId", userId.toString());
      formData.append("caption", caption);
      formData.append("location", location);

      console.log(`[FRONTEND] Uploading ${files.length} images to server...`);
      const res = await api.post("/api/posts", formData);
      onComplete(res.data.post || res.data);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Network uplink failed. Try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto py-4 md:py-8 h-full">
      <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[600px] lg:h-[750px]">
        
        {/* Media Canvas */}
        <div className="flex-1 bg-black/40 relative flex flex-col border-b lg:border-b-0 lg:border-r border-white/5">
          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 md:p-8">
             {previews.length > 0 ? (
               <div className="w-full h-full flex flex-col gap-6">
                 {/* Premium Photo Grid Preview */}
                 <div className="flex-1 min-h-[300px] relative">
                    <div className={`grid gap-2 w-full h-full max-h-[500px] ${
                      previews.length === 1 ? 'grid-cols-1' :
                      previews.length === 2 ? 'grid-cols-2' :
                      previews.length >= 3 ? 'grid-cols-2' : 'grid-cols-1'
                    }`}>
                      {previews.slice(0, 4).map((p, i) => {
                        let colSpan = "col-span-1";
                        let rowSpan = "row-span-1";
                        if (previews.length === 3 && i === 0) { rowSpan = "row-span-2"; }
                        if (previews.length >= 4 && i === 0) { rowSpan = "row-span-1"; }
                        
                        return (
                          <div key={i} className={`relative group/item ${colSpan} ${rowSpan} rounded-3xl overflow-hidden border border-white/10 shadow-lg`}>
                             <img src={p} className="w-full h-full object-cover" alt="Preview" />
                             <button 
                               onClick={() => removeFile(i)}
                               className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-500 backdrop-blur-md"
                             >
                               <X size={16} />
                             </button>
                             {i === 3 && previews.length > 4 && (
                               <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                 <span className="text-white font-black text-3xl">+{previews.length - 4}</span>
                               </div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                 </div>

                 {/* Horizontal Strip */}
                 <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    {previews.map((p, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-800 shrink-0 shadow-md">
                        <img src={p} className="w-full h-full object-cover" alt="thumb" />
                        <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-500"><X size={10} /></button>
                      </div>
                    ))}
                    {previews.length < 10 && (
                      <button 
                        onClick={() => document.getElementById("multi-upload")?.click()}
                        className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 hover:text-green-500 hover:border-green-500 transition-all bg-white/5"
                      >
                        <Plus size={24} />
                      </button>
                    )}
                 </div>
               </div>
             ) : (
               <div 
                 className="flex flex-col items-center justify-center gap-6 cursor-pointer w-full h-full group py-20"
                 onClick={() => document.getElementById("multi-upload")?.click()}
               >
                 <motion.div 
                   whileHover={{ scale: 1.05, rotate: 2 }}
                   className="w-32 h-32 bg-slate-800 rounded-[3rem] flex items-center justify-center text-slate-500 group-hover:text-green-500 group-hover:bg-slate-700 transition-all shadow-[0_0_50px_rgba(34,197,94,0.1)] border border-white/5"
                 >
                    <ImageIcon size={56} />
                 </motion.div>
                 <div className="text-center space-y-2">
                   <h3 className="font-black text-white uppercase text-xl tracking-tighter italic">Upload Visual Assets</h3>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Multi-Signal Support (Max 10 Images)</p>
                 </div>
               </div>
             )}
          </div>
          <input id="multi-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Sidebar: Details */}
        <div className="w-full lg:w-[420px] bg-slate-900 flex flex-col border-l border-white/5">
          <div className="p-8 border-b border-white/5 flex items-center gap-4">
             <div className="w-10 h-10 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <ImageIcon size={18} className="text-green-500" />
             </div>
             <span className="font-black text-sm text-white uppercase tracking-widest italic">Signal Configuration</span>
          </div>

          <div className="flex-1 p-8 space-y-10 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Caption Buffer</label>
              <textarea 
                placeholder="Synchronizing thoughts with the network..." 
                className="w-full h-40 bg-transparent border-none outline-none resize-none text-base text-white placeholder:text-slate-700 font-medium leading-relaxed"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Spatial Metadata</label>
              <div className="flex items-center gap-4 px-5 py-4 bg-slate-950 rounded-2xl border border-white/5 focus-within:border-green-500/50 transition-all">
                <MapPin size={20} className="text-slate-600" />
                <input 
                  type="text" 
                  placeholder="Earth Grid Coordinates..." 
                  className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-800 w-full font-bold"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 space-y-3">
               <div className="flex items-center gap-3">
                  <ShieldAlert size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Network Protocol</span>
               </div>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-tight">
                  Files are processed through our pHash engine to ensure visual uniqueness and protect the network from duplications.
               </p>
            </div>
          </div>

          <div className="p-8 border-t border-white/5 bg-slate-950/30 backdrop-blur-xl">
            <button 
              disabled={loading || files.length === 0 || isBanned}
              onClick={handleUpload}
              className="w-full py-5 bg-green-500 hover:bg-green-400 disabled:opacity-20 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_0_30px_rgba(34,197,94,0.2)] active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  TRANSMITTING...
                </>
              ) : "BROADCAST SIGNAL"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
