import React, { useState } from "react";
import axios from "axios";
import api from "../lib/api";
import { 
  PlusSquare, 
  TrendingUp, 
  Smile, 
  MapPin, 
  ShieldAlert 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Post } from "../types";

interface UploadPageProps {
  onComplete: () => void;
  userId: number;
}

export default function UploadPage({ onComplete, userId }: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const emojis = ["😊", "🔥", "❤️", "✨", "🙌", "📍", "📷", "🌟", "☘️", "🌈", "🦋", "🍃"];
  const userStr = localStorage.getItem("social_user");
  const isBanned = userStr ? JSON.parse(userStr).status !== "ACTIVE" : true;

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1600;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, "image/jpeg", 0.8);
        };
      };
    });
  };

  const handleUpload = async () => {
    if (!file || isBanned) return;
    setLoading(true);
    
    try {
      const compressedBlob = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressedBlob, "post.jpg");
      formData.append("userId", userId.toString());
      formData.append("caption", caption);
      formData.append("location", location);

      await api.post("/api/posts", formData);
      onComplete();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Upload failed. Check your network or account status.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto py-12">
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl transition-all overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Upload Post</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 italic">Share your image here</p>
          </div>
          <button 
            disabled={!file || loading || isBanned}
            onClick={handleUpload}
            className="group relative px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-slate-800 disabled:opacity-20 transition-all"
          >
            <span className="flex items-center gap-3">
              {loading ? "UPLOADING..." : "POST NOW"}
              <TrendingUp size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
        
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Image Selection Area */}
          <div 
            className="flex-1 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all overflow-hidden relative border-r border-slate-100 group/drop"
            onClick={() => document.getElementById("post-file")?.click()}
          >
            {preview ? (
              <img src={preview} className="w-full h-full object-cover group-hover/drop:scale-105 transition-transform duration-[4s]" />
            ) : (
              <div className="text-center p-12 transition-all">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-8 group-hover/drop:scale-110 group-hover/drop:shadow-lg transition-all">
                   <PlusSquare size={48} className="text-slate-200 group-hover/drop:text-slate-900 transition-colors" />
                </div>
                <h3 className="text-slate-900 font-black text-2xl tracking-tight mb-2 uppercase">UPLOAD IMAGE</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-[240px] mx-auto">Upload images for others to see</p>
              </div>
            )}
            <input id="post-file" type="file" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
            }} />
          </div>

          {/* Details Area */}
          <div className="w-full lg:w-[400px] p-12 space-y-10 bg-white flex flex-col">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] pl-2">Caption</label>
              <div className="relative">
                <textarea 
                  placeholder="Write something about your post..." 
                  className="w-full p-6 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300 outline-none resize-none h-48 text-sm font-medium transition-all"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
                <button 
                  onClick={() => setShowEmojis(!showEmojis)}
                  className="absolute bottom-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <Smile size={24} />
                </button>
              </div>

              <AnimatePresence>
                {showEmojis && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2.5 p-4 bg-white rounded-3xl border border-slate-100 shadow-xl">
                    {emojis.map(e => (
                      <button key={e} onClick={() => { setCaption(caption + e); setShowEmojis(false); }} className="text-xl hover:scale-125 transition-transform">{e}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] pl-2">Location</label>
              <div className="relative group/input">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-slate-900 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Add location..." 
                  className="w-full pl-16 pr-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-slate-300 outline-none text-sm transition-all"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 flex items-end">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert size={16} className="text-slate-900" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Notice</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase">All content is checked for safety. Breaking the rules causes an account block.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
