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
  Trash2 
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
      className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group/card mb-8"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={() => {
            window.dispatchEvent(new CustomEvent('open-profile', { detail: post.userId }));
          }}>
            <OptimizedImage 
              src={post.user.avatar || ""} 
              width={100} 
              className="w-12 h-12 rounded-[1.25rem] border-2 border-slate-50" 
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
              <span className="cursor-pointer hover:text-emerald-500 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: post.userId }))}>
                {post.user.name}
              </span>
              <CheckCircle2 size={14} className="text-emerald-500" />
              {currentUser.id !== post.userId && (
                <button 
                  onClick={handleFollow}
                  className={`ml-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${following ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            {post.location && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <MapPin size={10} className="text-slate-400" />
                {post.location}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.role === "ADMIN" && (
            <>
              <a 
                href={(post.imageUrl || "").replace('/upload/', '/upload/fl_attachment/')} 
                target="_blank" rel="noreferrer"
                download={`asset_${post.id}`}
                className="p-2.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all" 
                title="Download Asset Data"
              >
                <Download size={18} />
              </a>
              <button onClick={fetchChain} className="p-2.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="View matches">
                  <ShieldAlert size={18} />
              </button>
            </>
          )}
          {(currentUser.id === post.userId || currentUser.role === "ADMIN") && (
            <button onClick={() => { if(confirm("Delete this post?")) onDelete(); }} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Terminate Asset">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div 
        className="aspect-[4/5] bg-slate-100 relative group/media cursor-pointer overflow-hidden"
        onDoubleClick={handleDoubleTap}
      >
        <OptimizedImage 
          src={post.imageUrl || ""} 
          width={800}
          className="w-full h-full"
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
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              disabled={isLiking}
              onClick={handleLike} 
              className={`flex items-center gap-1.5 transition-all ${liked ? "text-red-500" : "text-slate-400 hover:text-slate-900"} disabled:opacity-50`}
            >
              <Heart size={24} fill={liked ? "currentColor" : "none"} />
              <span className="text-sm font-black">{likeCount}</span>
            </button>
            <button onClick={() => setShowComments(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-900">
              <MessageCircle size={24} />
              <span className="text-sm font-black">{postComments.length}</span>
            </button>
            <button 
              disabled={isReposting}
              onClick={handleRepost} 
              className={`flex items-center gap-1.5 transition-all ${isReposting ? "text-emerald-300" : "text-slate-400 hover:text-emerald-500"} disabled:cursor-wait`}
            >
              <Repeat2 size={24} className={isReposting ? "animate-spin" : ""} />
              <span className="text-sm font-black">{repostsCount}</span>
            </button>
          </div>
          <button onClick={() => setShowReport(true)} className="text-slate-300 hover:text-red-500 transition-colors">
            <Flag size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
             <span className="font-extrabold text-slate-900 text-sm">@{post.user.name}</span>
             <p className="text-sm text-slate-600 leading-relaxed font-medium">{post.caption}</p>
          </div>

          {post.parent && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <Repeat2 size={14} className="text-emerald-500" />
              <p className="text-xs text-slate-400 font-medium italic">Shared from @{post.parent.user.name}</p>
            </div>
          )}

          {/* Inline Comments (Last 2) */}
          {postComments.length > 0 && (
            <div className="space-y-2 pt-2">
              {postComments.slice(-2).map(c => (
                <div key={c.id} className="text-xs flex gap-2">
                  <span className="font-black text-slate-900">@{c.user.name}</span>
                  <span className="text-slate-600">{c.text}</span>
                </div>
              ))}
              {postComments.length > 2 && (
                <button onClick={() => setShowComments(true)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
                  View all {postComments.length} comments
                </button>
              )}
            </div>
          )}

          <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest pt-2">
            {new Date(post.createdAt).toLocaleDateString()} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Inline Comment Input */}
        <div className="pt-4 border-t border-slate-50">
           <form onSubmit={handleComment} className="flex items-center gap-3">
              <input 
                type="text" 
                placeholder="Add entry..." 
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-300"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={isBanned}
              />
              <button 
                type="submit" 
                disabled={!commentText.trim() || isBanned}
                className="text-emerald-500 font-black text-xs uppercase tracking-widest disabled:opacity-0"
              >
                Comment
              </button>
           </form>
        </div>
      </div>

      {/* Chain Modal */}
      <AnimatePresence>
        {showChain && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-2xl text-slate-900 tracking-tighter flex items-center gap-3">
                    <ShieldAlert className="text-emerald-500" /> Similar Images
                  </h3>
                </div>
                <button onClick={() => setShowChain(false)}><X size={24} /></button>
              </div>
              <div className="overflow-y-auto p-10 space-y-6">
                {chain.map((p) => (
                  <div key={p.id} className="flex items-center gap-6 p-5 rounded-[2rem] bg-white border border-slate-100">
                    <img src={p.imageUrl || ""} className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-1">
                       <div className="font-extrabold text-slate-900">{p.user.name}</div>
                       <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">{p.id === post.id ? "THIS POST" : "SIMILAR POST"}</div>
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-xl uppercase tracking-tighter">Comments</h3>
                <button onClick={() => setShowComments(false)}><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {postComments.map((c) => (
                  <div key={c.id} className="flex gap-4">
                    <img src={c.user.avatar} className="w-10 h-10 rounded-2xl" />
                    <div className="flex-1">
                      <div className="font-black text-slate-900 text-sm">@{c.user.name}</div>
                      <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl mt-1">{c.text}</p>
                    </div>
                  </div>
                ))}
                {postComments.length === 0 && (
                  <div className="py-20 text-center opacity-20">
                    <MessageCircle size={48} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">No signals detected yet</p>
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white max-w-sm w-full rounded-[3rem] p-10 shadow-2xl">
              <h3 className="font-black text-2xl mb-6 text-red-600 tracking-tighter">Flag Content</h3>
              <div className="space-y-3">
                {["Inappropriate Context", "Spam", "Synthetic / AI", "Other"].map(r => (
                  <button key={r} onClick={() => setReportReason(r)} className={`w-full p-4 rounded-2xl border text-left font-black text-xs uppercase tracking-widest ${reportReason === r ? 'bg-red-50 border-red-500 text-red-600' : 'border-slate-100'}`}>{r}</button>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowReport(false)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={handleReport} disabled={!reportReason} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Flag Asset</button>
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
