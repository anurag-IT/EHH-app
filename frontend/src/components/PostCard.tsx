import React, { useState, memo, useCallback, useRef } from "react";
import axios from "axios";
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Flag, 
  X, 
  ShieldAlert, 
  MapPin, 
  CheckCircle2, 
  Download, 
  Trash2,
  MoreVertical,
  Send,
  Bookmark 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-toastify";
import { Post, Comment, User } from "../types";
import api, { getOptimizedImageUrl } from "../lib/api";
import OptimizedImage from "./common/OptimizedImage";

interface PostCardProps {
  post: Post;
  onRepost: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

const PostCard = memo(({ post, onRepost, onDelete }: PostCardProps) => {
  const [showChain, setShowChain] = useState(false);
  const [chain, setChain] = useState<Post[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [commentText, setCommentText] = useState("");
  const [postComments, setPostComments] = useState<Comment[]>(post.comments || []);
  const [isLiking, setIsLiking] = useState(false); // Used ONLY for button animation/state
  const [showHeart, setShowHeart] = useState(false); // Used ONLY for central pop-up heart
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(false);
  const isSyncing = useRef(false);
  const [isReposting, setIsReposting] = useState(false);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount || 0);

  const currentUserStr = localStorage.getItem("social_user");
  const currentUser: User = currentUserStr ? JSON.parse(currentUserStr) : ({} as User);
  const isBanned = currentUser.status !== "ACTIVE";

  const handleReport = async () => {
    try {
      if (!reportReason) return;
      await api.post(`/api/posts/${post.id}/report`, { reason: reportReason });
      setShowReport(false);
      setReportReason("");
      toast.success("Report submitted");
    } catch {
      toast.error("Failed to submit report");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isBanned) return;

    // Optimistic Update
    const temporaryId = Date.now();
    const newComment: Comment = {
      id: temporaryId,
      text: commentText,
      user: currentUser,
      createdAt: new Date().toISOString()
    };
    
    const previousComments = [...postComments];
    setPostComments(prev => [...prev, newComment]);
    setCommentText("");

    try {
      const res = await api.post(`/api/posts/${post.id}/comment`, { text: newComment.text });
      // Replace temp comment with actual one from server
      setPostComments(prev => prev.map(c => c.id === temporaryId ? res.data : c));
    } catch {
      setPostComments(previousComments);
      toast.error("Comment failed. Reverting...");
    }
  };

  const handleLike = useCallback(async () => {
    if (isBanned || isSyncing.current) return;
    
    isSyncing.current = true;
    setIsLiking(true);
    
    // OPTIMISTIC UI
    const wasLiked = liked;
    const previousCount = likeCount;
    const newLiked = !wasLiked;
    const newCount = newLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

    setLiked(newLiked);
    setLikeCount(newCount);

    try {
      const res = await api.post(`/api/posts/${post.id}/like`, {});
      if (res.data.success) {
        setLiked(res.data.liked);
        if (typeof res.data.likesCount === 'number') {
          setLikeCount(res.data.likesCount);
        }
      }
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount(previousCount);
      toast.error("Handshake failure. Interaction reverted.");
    } finally {
      setIsLiking(false);
      setTimeout(() => {
        isSyncing.current = false;
      }, 200);
    }
  }, [liked, likeCount, isBanned, post.id]);

  const handleDoubleTap = useCallback(() => {
    if (isBanned) return;
    
    // TRIGGER HEART ANIMATION (Instant, independent)
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 300);

    // ONLY LIKE (Don't unlike on double tap)
    if (!liked) {
      handleLike();
    }
  }, [liked, isBanned, handleLike]);

  const handleFollow = async () => {
    if (isBanned || currentUser.id === post.userId) return;
    try {
      const res = await api.post(`/api/users/${post.userId}/follow`);
      setFollowing(res.data.following);
      toast.success(res.data.following ? `Followed ${post.user.name}` : `Unfollowed ${post.user.name}`);
    } catch { } // Silence errors for small interactions
  };

  const fetchChain = async () => {
    try {
      const res = await api.get(`/api/posts/${post.id}/chain`);
      setChain(res.data);
      setShowChain(true);
    } catch (err) {
      console.error("Tracking chain fetch failed", err);
    }
  };

  const handleRepost = async () => {
    if (isBanned || isReposting) return;
    setIsReposting(true);
    const previousCount = repostsCount;
    try {
      await api.post("/api/posts", {
        userId: currentUser.id,
        caption: `Reposted identifier transmission from @${post.user.name}`,
        parentId: post.id
      });
      
      onRepost();
      toast.success("Reposted!");
    } catch (err) {
      setRepostsCount(previousCount);
      toast.error("Repost failed. Network signal weak.");
    } finally {
      setTimeout(() => {
        isSyncing.current = false;
        setIsReposting(false);
      }, 400);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      viewport={{ once: true }}
      className="bg-slate-900 border border-slate-800/60 rounded-[1.5rem] overflow-hidden shadow-2xl transition-all duration-500 group/card mb-6 max-w-[500px] mx-auto overflow-y-visible"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer group/avatar" onClick={() => {
            window.dispatchEvent(new CustomEvent('open-profile', { detail: post.userId }));
          }}>
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
               <div className="p-0.5 bg-black rounded-full">
                  <OptimizedImage 
                    src={post.user.avatar || ""} 
                    width={80} 
                    className="w-8 h-8 rounded-full" 
                  />
               </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white cursor-pointer hover:text-slate-300 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: post.userId }))}>
                {post.user.name}
              </span>
              <CheckCircle2 size={12} className="text-blue-500 fill-blue-500/10" />
              {currentUser.id !== post.userId && (
                <>
                  <span className="text-slate-500 text-[10px]">•</span>
                  <button 
                    onClick={handleFollow}
                    className="text-[12px] font-bold text-blue-500 hover:text-white transition-colors"
                  >
                    {following ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
            {post.location && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                {post.location}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setShowReport(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <MoreVertical size={20} />
        </button>
      </div>

      <div 
        className="relative bg-black flex items-center justify-center overflow-hidden"
        style={{ minHeight: "300px", maxHeight: "60vh" }}
        onDoubleClick={handleDoubleTap}
      >
        <OptimizedImage 
          src={post.imageUrl || ""} 
          width={800}
          className="w-full h-auto max-h-full object-contain"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity" />
        
        <AnimatePresence>
          {showHeart && (
            <motion.div 
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: 1.2, opacity: 1 }}
               exit={{ scale: 1.5, opacity: 0 }}
               transition={{ duration: 0.25, type: "spring", damping: 10 }}
               className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <Heart size={100} fill="#EF4444" stroke="white" strokeWidth={2} className="drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    {/* Interactions */}
      <div className="p-4 pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              disabled={isLiking}
              onClick={handleLike} 
              className={`transition-transform active:scale-125 ${liked ? "text-red-500" : "text-white hover:text-slate-400"} disabled:opacity-50`}
            >
              <Heart size={26} fill={liked ? "currentColor" : "none"} strokeWidth={2} />
            </button>
            <button onClick={() => setShowComments(true)} className="text-white hover:text-slate-400 transition-colors">
              <MessageCircle size={26} strokeWidth={2} />
            </button>
            <button 
              className="text-white hover:text-slate-400 transition-colors"
            >
              <Send size={24} strokeWidth={2} />
            </button>
          </div>
          <button className="text-white hover:text-slate-400 transition-colors">
            <Bookmark size={26} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="text-sm font-bold text-white">
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </div>
          
          <div className="flex gap-2 items-start text-sm">
             <span className="font-bold text-white shrink-0">@{post.user.name}</span>
             <p className="text-slate-200 leading-snug">{post.caption}</p>
          </div>

          {postComments.length > 0 && (
            <button onClick={() => setShowComments(true)} className="text-sm text-slate-500 hover:text-slate-400 block pt-1">
              View all {postComments.length} comments
            </button>
          )}

          <div className="text-[10px] text-slate-500 uppercase font-medium pt-1">
            {new Date(post.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Inline Comment Input - Tightened */}
        <div className="pt-2 border-t border-slate-800/40">
           <form onSubmit={handleComment} className="flex items-center gap-3">
              <input 
                type="text" 
                placeholder="Add a comment..." 
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600 text-white"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isBanned}
              />
              <button 
                type="submit" 
                disabled={!commentText.trim() || isBanned}
                className="text-blue-500 font-bold text-sm disabled:opacity-0"
              >
                Post
              </button>
           </form>
        </div>
      </div>

      {/* Chain Modal */}
      <AnimatePresence>
        {showChain && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 w-full max-w-2xl rounded-[3rem] border border-slate-700 shadow-[0_0_50px_rgba(34,197,94,0.1)] overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-10 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-2xl text-white tracking-tighter flex items-center gap-3">
                    <ShieldAlert className="text-green-500" /> Similar Images
                  </h3>
                </div>
                <button onClick={() => setShowChain(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
              </div>
              <div className="overflow-y-auto p-10 space-y-6">
                {chain.map((p) => (
                  <div key={p.id} className="flex items-center gap-6 p-5 rounded-[2rem] bg-slate-900 border border-slate-700 shadow-inner">
                    <img src={p.imageUrl || ""} className="w-20 h-20 rounded-2xl object-cover border border-slate-700" />
                    <div className="flex-1">
                       <div className="font-extrabold text-white">{p.user.name}</div>
                       <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${p.id === post.id ? 'text-green-500' : 'text-slate-400'}`}>{p.id === post.id ? "THIS POST" : "SIMILAR POST"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 w-full max-w-xl rounded-[3rem] border border-slate-700 shadow-[0_0_50px_rgba(34,197,94,0.1)] overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-black text-xl text-white uppercase tracking-tighter">Comments</h3>
                <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
                {postComments.map((c) => (
                  <div key={c.id} className="flex gap-3 px-4">
                    <OptimizedImage 
                      src={c.user.avatar || ""} 
                      width={60} 
                      className="w-10 h-10 rounded-full shrink-0 ring-1 ring-slate-800" 
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">@{c.user.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-300 antialiased leading-snug">{c.text}</p>
                    </div>
                  </div>
                ))}
                {postComments.length === 0 && (
                  <div className="py-24 text-center opacity-30 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center mb-4">
                      <MessageCircle size={32} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">No signals detected</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-800 border border-slate-700 max-w-sm w-full rounded-[3rem] p-10 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
              <h3 className="font-black text-2xl mb-6 text-red-500 tracking-tighter">Flag Content</h3>
              <div className="space-y-3">
                {["Inappropriate Context", "Spam", "Synthetic / AI", "Other"].map(r => (
                  <button key={r} onClick={() => setReportReason(r)} className={`w-full p-4 rounded-2xl border text-left font-black text-xs uppercase tracking-widest ${reportReason === r ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-700/50'}`}>{r}</button>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowReport(false)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-white">Cancel</button>
                <button onClick={handleReport} disabled={!reportReason} className="flex-1 py-4 bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-500 hover:scale-105 active:scale-95 transition-all rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none">Flag Asset</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

PostCard.displayName = "PostCard";

export default PostCard;
