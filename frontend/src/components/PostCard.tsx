import React, { useState, memo, useCallback, useRef } from "react";
import { 
  Heart, 
  MessageCircle, 
  Flag, 
  X, 
  ShieldAlert, 
  MapPin, 
  CheckCircle2,
  Download, 
  Trash2,
  MoreVertical,
  Send,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Repeat2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-toastify";
import { Post, Comment, User } from "../types";
import api, { getOptimizedImageUrl } from "../lib/api";
import OptimizedImage from "./common/OptimizedImage";

interface PostCardProps {
  post: Post;
  currentUser?: { id: number; role: string; status: string } | null;
  onRepost: (newPost: Post) => void;
  onDelete: (deletedIds: number[]) => void;
}

/**
 * Premium Photo Grid Component
 * Renders images in a professional Facebook/Instagram-like collage.
 */
const PhotoGrid = ({ images, onPhotoClick }: { images: any[], onPhotoClick: (idx: number) => void }) => {
  const count = images.length;
  
  if (count === 1) {
    return (
      <div className="w-full aspect-square relative" onClick={() => onPhotoClick(0)}>
        <OptimizedImage src={images[0].url} width={800} className="w-full h-full object-cover" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 w-full aspect-square">
        {images.map((img, i) => (
          <div key={i} className="relative h-full" onClick={() => onPhotoClick(i)}>
            <OptimizedImage src={img.url} width={400} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 w-full aspect-square">
        <div className="relative h-full" onClick={() => onPhotoClick(0)}>
          <OptimizedImage src={images[0].url} width={400} className="w-full h-full object-cover" />
        </div>
        <div className="grid grid-rows-2 gap-1 h-full">
          <div className="relative" onClick={() => onPhotoClick(1)}>
            <OptimizedImage src={images[1].url} width={400} className="w-full h-full object-cover" />
          </div>
          <div className="relative" onClick={() => onPhotoClick(2)}>
            <OptimizedImage src={images[2].url} width={400} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full aspect-square">
        {images.map((img, i) => (
          <div key={i} className="relative" onClick={() => onPhotoClick(i)}>
            <OptimizedImage src={img.url} width={400} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  // 5 or more images (Facebook style: 2 on top, 3 on bottom)
  return (
    <div className="grid grid-cols-6 grid-rows-2 gap-1 w-full aspect-square">
      {/* Top row: 2 images (3 cols each) */}
      <div className="col-span-3 row-span-1 relative" onClick={() => onPhotoClick(0)}>
         <OptimizedImage src={images[0].url} width={400} className="w-full h-full object-cover" />
      </div>
      <div className="col-span-3 row-span-1 relative" onClick={() => onPhotoClick(1)}>
         <OptimizedImage src={images[1].url} width={400} className="w-full h-full object-cover" />
      </div>
      
      {/* Bottom row: 3 images (2 cols each) */}
      <div className="col-span-2 row-span-1 relative" onClick={() => onPhotoClick(2)}>
         <OptimizedImage src={images[2].url} width={200} className="w-full h-full object-cover" />
      </div>
      <div className="col-span-2 row-span-1 relative" onClick={() => onPhotoClick(3)}>
         <OptimizedImage src={images[3].url} width={200} className="w-full h-full object-cover" />
      </div>
      <div className="col-span-2 row-span-1 relative" onClick={() => onPhotoClick(4)}>
         <OptimizedImage src={images[4].url} width={200} className="w-full h-full object-cover" />
         {count > 5 && (
           <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
              <span className="text-white font-black text-xl">+{count - 5}</span>
           </div>
         )}
      </div>
    </div>
  );
};

const PostCard = memo(({ post, currentUser: currentUserProp, onRepost, onDelete }: PostCardProps) => {
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [liked, setLiked] = useState(post.isLiked || false);
  const [favourited, setFavourited] = useState(post.isFavourited || false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [commentText, setCommentText] = useState("");
  const [postComments, setPostComments] = useState<Comment[]>(post.comments || []);
  const [isLiking, setIsLiking] = useState(false);
  const [isFavouriting, setIsFavouriting] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [isLikingAnimation, setIsLikingAnimation] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(post.isFollowing || false);
  const [followStatus, setFollowStatus] = useState<'PENDING' | 'ACCEPTED' | null>(post.isFollowing ? 'ACCEPTED' : null);
  const isSyncing = useRef(false);
  const [isReposting, setIsReposting] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostsCount ?? post._count?.reposts ?? 0);
  const [commentCount, setCommentCount] = useState(post.commentsCount ?? post._count?.comments ?? postComments.length);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [showAdminDelete, setShowAdminDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const postImages = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls.map(url => ({ url })) : [{ url: post.imageUrl || "" }];

  // Use prop if provided, fall back to localStorage (only parse once via prop from App)
  const currentUser: any = currentUserProp ?? (() => {
    try { return JSON.parse(localStorage.getItem("ehh_user") || "{}"); } catch { return {}; }
  })();
  const isBanned = currentUser.status === "BANNED" || currentUser.status === "PERMANENT_BAN";

  const handleLike = useCallback(async () => {
    if (isBanned || isSyncing.current) return;
    isSyncing.current = true;
    setIsLiking(true);
    setIsLikingAnimation(true);
    setTimeout(() => setIsLikingAnimation(false), 1000);

    const wasLiked = liked;
    const previousCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? previousCount - 1 : previousCount + 1);
    try {
      const res = await api.post(`/api/posts/${post.id}/like`, {});
      if (res.data.success) {
        setLiked(res.data.liked);
        if (typeof res.data.likesCount === 'number') setLikeCount(res.data.likesCount);
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLiking(false);
      setTimeout(() => { isSyncing.current = false; }, 200);
    }
  }, [liked, likeCount, isBanned, post.id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || isBanned) return;

    // Optimistic: show comment instantly
    const tempId = -Date.now();
    const tempComment: Comment = {
      id: tempId,
      text,
      user: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar } as User,
      createdAt: new Date().toISOString(),
    };
    setPostComments(prev => [...prev, tempComment]);
    setCommentCount(prev => prev + 1);
    setCommentText("");

    try {
      const res = await api.post(`/api/posts/${post.id}/comment`, { text });
      if (res.data.success) {
        setPostComments(prev => prev.map(c => c.id === tempId ? res.data.data : c));
      }
    } catch {
      setPostComments(prev => prev.filter(c => c.id !== tempId));
      setCommentCount(prev => prev - 1);
      setCommentText(text);
      toast.error("Comment failed");
    }
  };

  const handleRepost = useCallback(async () => {
    if (isBanned || isReposting) return;
    setIsReposting(true);
    setRepostCount(prev => prev + 1); // optimistic
    try {
      const res = await api.post(`/api/posts/${post.id}/repost`, {});
      if (res.data.success) {
        toast.success("Reposted!", { autoClose: 1500 });
        if (onRepost) onRepost(res.data.data);
      } else {
        setRepostCount(prev => prev - 1);
      }
    } catch {
      setRepostCount(prev => prev - 1);
      toast.error("Repost failed.");
    } finally {
      setIsReposting(false);
    }
  }, [post.id, isBanned, isReposting, onRepost]);

  const handleFollow = async () => {
    if (isBanned || currentUser.id === post.userId) return;
    const prevFollowing = following;
    const prevStatus = followStatus;
    // Optimistic toggle
    if (following) {
      setFollowing(false);
      setFollowStatus(null);
    } else {
      setFollowing(true);
      setFollowStatus(post.user.isPrivate ? 'PENDING' : 'ACCEPTED');
    }
    try {
      const res = await api.post(`/api/users/${post.userId}/follow`);
      setFollowing(res.data.following);
      setFollowStatus(res.data.status);
    } catch {
      setFollowing(prevFollowing);
      setFollowStatus(prevStatus);
    }
  };
  
  const handleFavourite = async () => {
    if (isBanned || isFavouriting) return;
    setIsFavouriting(true);
    const wasFavourited = favourited;
    setFavourited(!wasFavourited);
    try {
      const res = await api.post(`/api/posts/${post.id}/favourite`);
      if (res.data.success) {
        setFavourited(res.data.favourited);
        toast.success(res.data.favourited ? "Signal saved to cloud" : "Signal removed from cloud", { 
          icon: <Bookmark size={16} className="text-yellow-500" />,
          autoClose: 1500
        });
      }
    } catch {
      setFavourited(wasFavourited);
      toast.error("Failed to sync bookmark.");
    } finally {
      setIsFavouriting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: 'Earth for Human and Humanity',
      text: post.caption || 'Check out this network signal on EHH!',
      url: url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast.success("Signal link copied to clipboard!");
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Signal link copied to clipboard!");
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim() || isBanned) return;
    try {
      await api.post(`/api/posts/${post.id}/report`, { reason: reportReason });
      toast.success("Signal flagged for review. Thank you for keeping EHH safe.");
      setShowReport(false);
      setReportReason("");
    } catch {
      toast.error("Failed to submit report.");
    }
  };
  
  const handleAdminDeleteSingle = async () => {
    if (!confirm("Delete this specific post?")) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/posts/${post.id}`);
      toast.success("Post deleted.");
      onDelete([post.id]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error deleting post.");
    } finally {
      setIsDeleting(false);
      setShowAdminDelete(false);
    }
  };

  const handleAdminDeleteFamily = async () => {
    if (!confirm("Delete ALL similar images across the network? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/admin/delete/${post.id}`);
      toast.success(`Deleted ${res.data.count} similar images.`);
      onDelete(res.data.deletedIds || [post.id]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error during global delete.");
    } finally {
      setIsDeleting(false);
      setShowAdminDelete(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-slate-950 border border-white/[0.05] rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden shadow-2xl mb-4 md:mb-6 max-w-[500px] mx-auto"
    >
      {/* Header */}
      <div className="p-3 md:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: post.userId }))} className="cursor-pointer">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
               <div className="p-0.5 bg-black rounded-full">
                  <OptimizedImage src={post.user.avatar || ""} width={80} className="w-8 h-8 rounded-full" />
               </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[13px] md:text-sm text-white cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: post.userId }))}>
                {post.user.name}
              </span>
              <CheckCircle2 size={12} className="text-blue-500 fill-blue-500/10" />
              {currentUser.id !== post.userId && (
                <button 
                  onClick={handleFollow} 
                  className={`text-[10px] md:text-[12px] font-bold md:font-black uppercase tracking-tighter px-2.5 py-1 rounded-full transition-all duration-300 ${
                    followStatus === 'PENDING' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                    following ? "bg-slate-800 text-slate-400 border border-slate-700" : 
                    "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-slate-900"
                  } ml-2`}
                >
                  {followStatus === 'PENDING' ? 'Requested' : following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            {post.location && <div className="text-[10px] text-slate-400">{post.location}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {currentUser.role === 'ADMIN' && (
            <div className="relative">
              <button 
                onClick={() => setShowAdminDelete(!showAdminDelete)} 
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                title="Admin Delete"
              >
                <Trash2 size={18} />
              </button>
              
              <AnimatePresence>
                {showAdminDelete && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[150] overflow-hidden p-1.5"
                  >
                    <button 
                      onClick={handleAdminDeleteSingle}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-xl transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <Trash2 size={14} className="text-red-500" />
                      Delete This Post
                    </button>
                    <button 
                      onClick={handleAdminDeleteFamily}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-3 text-xs font-black text-red-100 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all flex items-center gap-3 border border-red-500/20 mt-1 disabled:opacity-50"
                    >
                      <ShieldAlert size={14} className="text-red-500" />
                      Delete Entire Related
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        <button onClick={() => setShowReport(true)} className="p-2 text-slate-400"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Professional Description Area (Upper Side) */}
      <div className="px-4 pb-3">
        <div className="flex flex-col gap-1">
          <p className="text-[14px] md:text-[15px] leading-relaxed text-white whitespace-pre-wrap font-medium tracking-tight">
            {post.caption}
          </p>
        </div>
      </div>

      {post.isAiGenerated && (
        <div className="px-4">
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 text-xs font-semibold px-3 py-1.5 rounded-lg mb-2">
            <span>⚠️</span>
            <span>AI Generated Image — No points awarded for this post</span>
          </div>
        </div>
      )}

      {/* Media Grid Content */}
      <div className="relative bg-black transition-all" onDoubleClick={() => { setShowHeart(true); if (!liked) handleLike(); setTimeout(() => setShowHeart(false), 500); }}>
         <PhotoGrid images={postImages} onPhotoClick={(idx) => setViewingIndex(idx)} />
         
         <AnimatePresence>
          {showHeart && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <Heart size={100} fill="#EF4444" stroke="white" strokeWidth={2} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactions */}
      <div className="p-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <motion.button 
              animate={isLikingAnimation ? { scale: [1, 1.4, 1] } : {}}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLike} 
              className={`${liked ? "text-red-500" : "text-white"}`}
            >
              <Heart size={26} fill={liked ? "currentColor" : "none"} strokeWidth={2} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowComments(true)}
              className="text-white hover:text-slate-400"
            >
              <MessageCircle size={24} strokeWidth={2} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRepost}
              disabled={isReposting}
              className={`flex items-center gap-1.5 ${isReposting ? "opacity-50" : "text-white hover:text-amber-400 transition-colors"} ${post.parentId ? "text-amber-500" : ""}`}
            >
              <Repeat2 size={26} strokeWidth={2} />
              {repostCount > 0 && <span className="text-xs font-bold">{repostCount}</span>}
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="text-white hover:text-slate-400"
            >
              <Send size={24} />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowReport(true)}
              className="text-white hover:text-red-500 transition-colors"
              title="Report Signal"
            >
              <Flag size={24} />
            </motion.button>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleFavourite}
            className={`transition-colors ${favourited ? "text-yellow-500" : "text-white hover:text-yellow-500"}`}
          >
            <Bookmark size={26} fill={favourited ? "currentColor" : "none"} />
          </motion.button>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-black text-white">{likeCount.toLocaleString()} Likes</div>
          {commentCount > 0 && (
            <button onClick={() => setShowComments(true)} className="text-xs text-slate-500 font-bold uppercase tracking-widest pt-2">View Signals ({commentCount})</button>
          )}
          <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest pt-2">{new Date(post.createdAt).toLocaleDateString()}</div>
        </div>

        <form onSubmit={handleComment} className="pt-4 border-t border-slate-800/50 flex gap-3">
           <input type="text" placeholder="Add comment..." className="flex-1 bg-transparent text-sm outline-none text-white" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
           <button type="submit" disabled={!commentText.trim()} className="text-blue-500 font-black text-xs uppercase disabled:opacity-0 transition-all active:scale-90">Post</button>
        </form>

        <AnimatePresence>
          {showReport && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[3000] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-800 w-full max-w-md rounded-[2.5rem] border border-slate-700 p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Flag Signal</h3>
                  <button onClick={() => setShowReport(false)} className="text-slate-400"><X size={24} /></button>
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Please select a reason for reporting this content. Our moderators will investigate the transmission immediately.</p>
                <form onSubmit={handleReport} className="space-y-4">
                   <select 
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white text-sm outline-none focus:border-green-500/50 transition-all"
                    required
                   >
                     <option value="">Select Reason...</option>
                     <option value="SPAM">Spam or Misleading</option>
                     <option value="HATE">Hate Speech</option>
                     <option value="HARASSMENT">Harassment</option>
                     <option value="VIOLENCE">Graphic Violence</option>
                     <option value="OTHER">Other Issue</option>
                   </select>
                   <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">Submit Report</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Full Size Carousel Viewer */}
      <AnimatePresence>
        {viewingIndex !== null && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl">
             <button onClick={() => setViewingIndex(null)} className="absolute top-6 right-6 p-3 bg-slate-800 text-white rounded-full z-[3001]"><X size={24} /></button>
             
             <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={postImages[viewingIndex].url}
                  alt="Full view"
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-xl"
                  style={{ maxHeight: 'calc(100vh - 80px)', maxWidth: '100%' }}
                />
                
                {postImages.length > 1 && (
                  <>
                    <button onClick={() => setViewingIndex(prev => Math.max(0, prev! - 1))} disabled={viewingIndex === 0} className="absolute left-4 p-4 bg-slate-800/50 text-white rounded-full disabled:opacity-0"><ChevronLeft size={32} /></button>
                    <button onClick={() => setViewingIndex(prev => Math.min(postImages.length - 1, prev! + 1))} disabled={viewingIndex === postImages.length - 1} className="absolute right-4 p-4 bg-slate-800/50 text-white rounded-full disabled:opacity-0"><ChevronRight size={32} /></button>
                  </>
                )}
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-800 w-full max-w-xl rounded-[3rem] border border-slate-700 overflow-hidden max-h-[85vh] flex flex-col">
              <div className="p-8 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-black text-xl text-white uppercase tracking-tighter">Transmission Response</h3>
                <button onClick={() => setShowComments(false)} className="text-slate-400"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {postComments.map((c) => (
                  <div key={c.id} className="flex gap-4">
                    <OptimizedImage src={c.user.avatar || ""} width={60} className="w-10 h-10 rounded-full shrink-0" />
                    <div>
                      <div className="font-black text-xs text-white">@{c.user.name}</div>
                      <p className="text-sm text-slate-300 mt-1">{c.text}</p>
                    </div>
                  </div>
                ))}
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
