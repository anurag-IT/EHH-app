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
  Maximize2
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

const PostCard = memo(({ post, onRepost, onDelete }: PostCardProps) => {
  const [showChain, setShowChain] = useState(false);
  const [chain, setChain] = useState<Post[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [commentText, setCommentText] = useState("");
  const [postComments, setPostComments] = useState<Comment[]>(post.comments || []);
  const [isLiking, setIsLiking] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(false);
  const isSyncing = useRef(false);
  const [isReposting, setIsReposting] = useState(false);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const postImages = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls.map(url => ({ url })) : [{ url: post.imageUrl || "" }];

  const currentUserStr = localStorage.getItem("social_user");
  const currentUser: User = currentUserStr ? JSON.parse(currentUserStr) : ({} as User);
  const isBanned = currentUser.status !== "ACTIVE";

  const handleLike = useCallback(async () => {
    if (isBanned || isSyncing.current) return;
    isSyncing.current = true;
    setIsLiking(true);
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
    if (!commentText.trim() || isBanned) return;
    try {
      const res = await api.post(`/api/posts/${post.id}/comment`, { text: commentText });
      setPostComments(prev => [...prev, res.data]);
      setCommentText("");
    } catch {
      toast.error("Comment failed");
    }
  };

  const handleFollow = async () => {
    if (isBanned || currentUser.id === post.userId) return;
    try {
      const res = await api.post(`/api/users/${post.userId}/follow`);
      setFollowing(res.data.following);
    } catch { }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-slate-900 border border-slate-800/60 rounded-[1.5rem] overflow-hidden shadow-2xl mb-6 max-w-[500px] mx-auto"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
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
              <span className="font-bold text-sm text-white cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-profile', { detail: post.userId }))}>
                {post.user.name}
              </span>
              <CheckCircle2 size={12} className="text-blue-500 fill-blue-500/10" />
              {currentUser.id !== post.userId && (
                <button onClick={handleFollow} className="text-[12px] font-bold text-blue-500 hover:text-white ml-2">
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
            {post.location && <div className="text-[10px] text-slate-400">{post.location}</div>}
          </div>
        </div>
        <button onClick={() => setShowReport(true)} className="p-2 text-slate-400"><MoreVertical size={20} /></button>
      </div>

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
            <button onClick={handleLike} className={`${liked ? "text-red-500" : "text-white"}`}>
              <Heart size={26} fill={liked ? "currentColor" : "none"} strokeWidth={2} />
            </button>
            <button onClick={() => setShowComments(true)} className="text-white hover:text-slate-400">
              <MessageCircle size={26} strokeWidth={2} />
            </button>
            <button className="text-white hover:text-slate-400"><Send size={24} /></button>
          </div>
          <button className="text-white"><Bookmark size={26} /></button>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-black text-white">{likeCount.toLocaleString()} Likes</div>
          <div className="flex gap-2 text-sm">
             <span className="font-black text-white">@{post.user.name}</span>
             <p className="text-slate-300 line-clamp-3">{post.caption}</p>
          </div>
          {postComments.length > 0 && (
            <button onClick={() => setShowComments(true)} className="text-xs text-slate-500 font-bold uppercase tracking-widest pt-2">View Signals ({postComments.length})</button>
          )}
          <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest pt-2">{new Date(post.createdAt).toLocaleDateString()}</div>
        </div>

        <form onSubmit={handleComment} className="pt-4 border-t border-slate-800/50 flex gap-3">
           <input type="text" placeholder="Add comment..." className="flex-1 bg-transparent text-sm outline-none text-white" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
           <button type="submit" disabled={!commentText.trim()} className="text-blue-500 font-black text-xs uppercase disabled:opacity-0">Post</button>
        </form>
      </div>

      {/* Full Size Carousel Viewer */}
      <AnimatePresence>
        {viewingIndex !== null && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl">
             <button onClick={() => setViewingIndex(null)} className="absolute top-6 right-6 p-3 bg-slate-800 text-white rounded-full z-[3001]"><X size={24} /></button>
             
             <div className="relative w-full h-full flex items-center justify-center p-4">
                <OptimizedImage src={postImages[viewingIndex].url} width={1200} className="max-w-full max-h-full object-contain shadow-2xl" />
                
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
