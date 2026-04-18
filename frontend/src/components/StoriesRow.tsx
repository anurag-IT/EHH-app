import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, Plus, Camera } from "lucide-react";
import OptimizedImage from "./common/OptimizedImage";
import api from "../lib/api";
import { User, UserStories, Story } from "../types";
import { toast } from "react-toastify";

export default function StoriesRow() {
  const [groupedStories, setGroupedStories] = useState<UserStories[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserStr = localStorage.getItem("social_user");
  const currentUser: User = currentUserStr ? JSON.parse(currentUserStr) : ({} as User);

  const fetchStories = async () => {
    try {
      const res = await api.get("/api/stories");
      setGroupedStories(res.data);
    } catch (err) {
      console.error("Failed to load stories", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("userId", currentUser.id.toString());

    try {
      await api.post("/api/stories", formData);
      toast.success("Signal broadcasted to Stories");
      fetchStories();
    } catch (err: any) {
      console.error("Story Upload Error:", err.response?.data || err);
      toast.error(err.response?.data?.error || "Story transmission failed");
    } finally {
      setUploading(false);
    }
  };

  const nextStory = () => {
    if (selectedUserIndex === null) return;
    const user = groupedStories[selectedUserIndex];
    if (selectedStoryIndex < user.stories.length - 1) {
      setSelectedStoryIndex(prev => prev + 1);
    } else if (selectedUserIndex < groupedStories.length - 1) {
      setSelectedUserIndex(prev => prev! + 1);
      setSelectedStoryIndex(0);
    } else {
      setSelectedUserIndex(null);
    }
  };

  const prevStory = () => {
    if (selectedUserIndex === null) return;
    if (selectedStoryIndex > 0) {
      setSelectedStoryIndex(prev => prev - 1);
    } else if (selectedUserIndex > 0) {
      setSelectedUserIndex(prev => prev! - 1);
      const prevUser = groupedStories[selectedUserIndex - 1];
      setSelectedStoryIndex(prevUser.stories.length - 1);
    }
  };

  // Auto-progress
  useEffect(() => {
    let timer: any;
    if (selectedUserIndex !== null) {
      timer = setTimeout(nextStory, 5000);
    }
    return () => clearTimeout(timer);
  }, [selectedUserIndex, selectedStoryIndex]);

  return (
    <div className="relative">
      <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-hide px-2">
        {/* Current User Upload */}
        <div className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group">
           <div 
             onClick={() => fileInputRef.current?.click()}
             className="relative p-1 rounded-full bg-slate-800 border-2 border-slate-700 group-hover:border-blue-500 transition-all"
           >
             <div className="p-0.5 bg-slate-900 rounded-full">
                <OptimizedImage 
                  src={currentUser.avatar || ""} 
                  width={80} 
                  className="w-16 h-16 rounded-full opacity-60 group-hover:opacity-100" 
                />
             </div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus size={20} className="text-blue-500 bg-slate-900 rounded-full p-0.5 shadow-lg" />
                )}
             </div>
           </div>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Signal</span>
           <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
        </div>

        {groupedStories.map((group, i) => (
          <motion.div 
            key={group.userId} 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              setSelectedUserIndex(i);
              setSelectedStoryIndex(0);
            }}
            className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group"
          >
            <div className="relative p-1 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
              <div className="p-0.5 bg-slate-900 rounded-full">
                <OptimizedImage 
                  src={group.user.avatar} 
                  width={100} 
                  className="w-16 h-16 rounded-full border-2 border-slate-900" 
                />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">
              {group.user.name}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Story Viewer Overlay */}
      <AnimatePresence>
        {selectedUserIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center backdrop-blur-3xl"
          >
            <div className="w-full max-w-lg aspect-[9/16] relative overflow-hidden bg-slate-900 md:rounded-3xl shadow-2xl">
               <div className="absolute top-0 left-0 right-0 p-4 z-20 bg-gradient-to-b from-black/80 to-transparent">
                  {/* Progress Bars */}
                  <div className="flex gap-1 mb-4">
                    {groupedStories[selectedUserIndex].stories.map((_, idx) => (
                      <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-white"
                          initial={{ width: "0%" }}
                          animate={{ width: idx === selectedStoryIndex ? "100%" : (idx < selectedStoryIndex ? "100%" : "0%") }}
                          transition={{ duration: idx === selectedStoryIndex ? 5 : 0, ease: "linear" }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <OptimizedImage 
                          src={groupedStories[selectedUserIndex].user.avatar} 
                          width={60} 
                          className="w-10 h-10 rounded-full ring-2 ring-white/20" 
                        />
                        <div className="flex flex-col">
                           <span className="text-white font-bold text-sm tracking-tight">{groupedStories[selectedUserIndex].user.name}</span>
                           <span className="text-white/60 text-[10px] uppercase font-bold tracking-widest">
                             {new Date(groupedStories[selectedUserIndex].stories[selectedStoryIndex].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                     </div>
                     <button onClick={() => setSelectedUserIndex(null)} className="text-white/60 hover:text-white p-2">
                        <X size={24} />
                     </button>
                  </div>
               </div>

               <div className="w-full h-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${selectedUserIndex}-${selectedStoryIndex}`}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="w-full h-full"
                    >
                      <OptimizedImage 
                        src={groupedStories[selectedUserIndex].stories[selectedStoryIndex].imageUrl} 
                        width={1000} 
                        className="w-full h-full object-cover" 
                      />
                    </motion.div>
                  </AnimatePresence>
               </div>

               {/* Navigation Overlays */}
               <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={prevStory} />
               <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" onClick={nextStory} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
