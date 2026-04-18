import express from "express";
import compression from "compression";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";

import { PrismaClient } from "@prisma/client";
import { uploadImage } from "./src/services/uploadService.js";
import { processImageAsync, extractFeaturesFromBuffer } from "./src/services/imageProcessingService.js";
import { getSimilarityResults } from "./src/services/imageSimilarityService.js";

import { createServer } from "http";
import { Server } from "socket.io";

const prisma = new PrismaClient() as any;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ 
  origin: (origin: any, callback: any) => {
    if(!origin) return callback(null, true);
    return callback(null, true); 
  },
  credentials: true 
})); 
app.use(express.json());
app.use(compression() as any);

// --- Real-time Tracking ---
const userSockets = new Map<number, string>(); // userId -> socketId

// --- Simple Cache Implementation ---
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const upload = multer({ storage: multer.memoryStorage() });

function generateUniqueId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "EH-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const checkUserRestriction = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers["x-user-id"] || req.body.userId;
  if (!userId) return res.status(401).json({ error: "Please login to continue" });

  try {
    const id = parseInt(userId as string);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update real-time presence (last seen)
    prisma.user.update({ where: { id }, data: { lastSeen: new Date() } }).catch(() => {});

    if (user.status === "BANNED" && user.banUntil && new Date() > user.banUntil) {
       await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", isRestricted: false, banUntil: null } });
       user.status = "ACTIVE";
       user.isRestricted = false;
    }

    if (user.status === "BANNED" || user.status === "PERMANENT_BAN" || user.isRestricted) {
      return res.status(403).json({ error: "Your account is currently blocked." });
    }
    
    (req as any).currentUser = user;
    next();
  } catch (error: any) {
    res.status(500).json({ error: "Server sync fail" });
  }
};

const checkAdminMode = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Please login" });

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId as string) } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access is needed." });
    
    (req as any).adminUser = user;
    next();
  } catch (error: any) {
    res.status(500).json({ error: "Server error" });
  }
};

app.post("/api/users/register", async (req: any, res: any) => {
  try {
    let { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and Email are required" });

    email = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "An account with this email already exists." });

    const uniqueId = generateUniqueId();
    const user = await prisma.user.create({
      data: { name: name.trim(), email, uniqueId, avatar: `https://i.pravatar.cc/150?u=${email}` },
    });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/users/login", async (req: any, res: any) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    email = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user) return res.status(404).json({ error: "No account found with this email. Please sign up." });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/users/:id", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts", async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;
    const xUserId = req.headers["x-user-id"];
    const currentUserId = xUserId ? parseInt(xUserId as string) : null;
    const isValidUser = currentUserId && !isNaN(currentUserId);

    // Cache key based on query params and user
    const cacheKey = `posts_${limit}_${cursor || 'start'}_${currentUserId || 'guest'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    const selectFields: any = {
      id: true, imageUrl: true, caption: true, location: true, createdAt: true, userId: true,
      user: { select: { name: true, avatar: true, uniqueId: true } },
      images: { select: { url: true, order: true } },
      _count: { select: { likes: true, comments: true, reposts: true } }
    };

    if (isValidUser) {
      selectFields.likes = { where: { userId: currentUserId }, select: { id: true } };
    }

    const posts = await prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      select: selectFields
    });

    let nextCursor = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem.id;
    }

    const formattedPosts = posts.map((post: any) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      caption: post.caption,
      location: post.location,
      createdAt: post.createdAt,
      user: post.user,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      repostsCount: post._count.reposts,
      isLiked: isValidUser && post.likes ? post.likes.length > 0 : false
    }));

    const responseData = { posts: formattedPosts, nextCursor };
    setCachedData(cacheKey, responseData);
    res.json(responseData);
  } catch (error: any) {
    res.status(500).json({ error: "Unable to retrieve network feed." });
  }
});

app.delete("/api/posts/:id", checkUserRestriction, async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const userId = req.currentUser.id;
  const userRole = req.currentUser.role;
  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.userId !== userId && userRole !== "ADMIN") return res.status(403).json({ error: "You can only delete your own posts." });
    await prisma.post.delete({ where: { id } });
    res.json({ message: "Post deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/comment", checkUserRestriction, async (req: any, res: any) => {
  try {
    const { text } = req.body;
    const postId = parseInt(req.params.id);
    const userId = req.currentUser.id;
    if (!text) return res.status(400).json({ error: "Comment text is required" });
    const comment = await prisma.comment.create({
      data: { text, postId, userId },
      include: { user: true, post: { include: { user: true } } }
    });
    // Create notification (wrap in separate try/catch so comment doesn't fail if notification does)
    if (comment.post.userId !== userId) {
      try {
        await prisma.notification.create({
          data: {
            userId: comment.post.userId, 
            senderId: userId, 
            senderName: comment.user.name,
            senderAvatar: comment.user.avatar, 
            type: "COMMENT", 
            postId: postId, 
            content: "commented on your post"
          }
        });
      } catch (notifyError) {
        console.error("[NOTIFICATION ERROR]", notifyError);
      }
    }
    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/stories", upload.single("image"), checkUserRestriction, async (req: any, res: any) => {
  try {
    const userId = req.body.userId || req.currentUser.id;
    if (!req.file) return res.status(400).json({ error: "No image file provided" });

    console.log(`[STORY UPLOAD] User ${userId} uploading story...`);
    const uploadResult = await uploadImage(req.file.buffer);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await prisma.story.create({
      data: {
        userId: parseInt(userId),
        imageUrl: uploadResult.secure_url,
        imagePath: uploadResult.public_id,
        expiresAt
      },
      include: { user: true }
    });

    console.log(`[STORY SUCCESS] Story ${story.id} created.`);
    res.json(story);
  } catch (error: any) {
    console.error("[STORY ERROR]", error);
    res.status(500).json({ error: error.message || "Internal story transmission failure" });
  }
});

app.get("/api/stories", async (req: any, res: any) => {
  try {
    const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"] as string) : null;
    const now = new Date();

    let stories;
    if (userId) {
       const following = await prisma.userFollow.findMany({
         where: { followerId: userId },
         select: { followingId: true }
       });
       const followingIds = following.map(f => f.followingId);
       followingIds.push(userId);

       stories = await prisma.story.findMany({
         where: {
           userId: { in: followingIds },
           expiresAt: { gt: now }
         },
         include: { user: { select: { id: true, name: true, avatar: true } } },
         orderBy: { createdAt: "desc" }
       });
    } else {
       stories = await prisma.story.findMany({
         where: { expiresAt: { gt: now } },
         include: { user: { select: { id: true, name: true, avatar: true } } },
         orderBy: { createdAt: "desc" },
         take: 30
       });
    }

    const grouped = stories.reduce((acc: any, story: any) => {
      if (!acc[story.userId]) {
        acc[story.userId] = {
          userId: story.userId,
          user: story.user,
          stories: []
        };
      }
      acc[story.userId].stories.push(story);
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts", upload.array("images", 20), checkUserRestriction, async (req: any, res: any) => {
  try {
    const { caption, location, parentId } = req.body;
    const userId = req.body.userId || req.currentUser.id;
    const files = req.files as any[];

    if ((!files || files.length === 0) && !parentId) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    let mainImageUrl = "";
    let mainImagePath = "";
    let mainPhash = null;
    let postImages: any[] = [];

    if (parentId) {
      const parent = await prisma.post.findUnique({ where: { id: parseInt(parentId) }, include: { images: true } });
      if (!parent) return res.status(404).json({ error: "Parent post not found" });
      mainImageUrl = parent.imageUrl || "";
      mainImagePath = parent.imagePath;
      mainPhash = parent.phash;
      postImages = parent.images.map((img: any) => ({ url: img.url, path: img.path, order: img.order }));
    } else {
      // Parallel upload all images
      const uploadPromises = files.map(file => uploadImage(file.buffer));
      const results = await Promise.all(uploadPromises);
      
      mainImageUrl = results[0].secure_url;
      mainImagePath = results[0].public_id;
      postImages = results.map((res, i) => ({
        url: res.secure_url,
        path: res.public_id,
        order: i
      }));
    }

    const post = await prisma.post.create({
      data: {
        userId: parseInt(userId),
        caption,
        location: location || null,
        imagePath: mainImagePath,
        imageUrl: mainImageUrl,
        phash: mainPhash,
        parentId: parentId ? parseInt(parentId) : null,
        images: {
          create: postImages
        }
      },
      include: { 
        user: { select: { name: true } },
        images: true
      }
    });
    
    res.json({
      success: true,
      post: {
        ...post,
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        isLiked: false
      }
    });

    if (!parentId && mainImageUrl) {
      processImageAsync(post.id, mainImageUrl).catch((err: any) => {
         console.error(`Failed to trigger async processing for post ${post.id}`, err);
      });
    }
  } catch (error: any) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/:id/chain", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    const related = await prisma.post.findMany({
      where: { OR: [{ phash: post.phash }, { parentId: post.id }, { id: post.parentId || -1 }] },
      include: { user: true }
    });
    res.json(related);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/stats", checkAdminMode, async (req: any, res: any) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: "ACTIVE" } });
    const bannedUsers = await prisma.user.count({ where: { status: "BANNED" } });
    const totalPosts = await prisma.post.count();
    const flaggedCount = await prisma.flaggedContent.count({ where: { status: "PENDING" } });
    res.json({ totalUsers, activeUsers, bannedUsers, totalPosts, flaggedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/users", checkAdminMode, async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'desc' },
      include: { _count: { select: { posts: true } } }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/users/:id/ban", checkAdminMode, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const { durationDays, reason } = req.body;
    let banUntil = null;
    let status = "BANNED";
    if (durationDays === -1) {
      status = "PERMANENT_BAN";
    } else if (durationDays > 0) {
      banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + durationDays);
    }
    const user = await prisma.user.update({
      where: { id },
      data: { status, banUntil, banReason: reason, isRestricted: true, banCount: { increment: 1 } }
    });
    await prisma.adminLog.create({
      data: { actionType: "ban_user", adminName: req.adminUser.name, targetId: user.uniqueId, details: `Ban duration: ${durationDays} days. Reason: ${reason}` }
    });
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/users/:id/unban", checkAdminMode, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", banUntil: null, isRestricted: false, banReason: null }
    });
    await prisma.adminLog.create({
      data: { actionType: "unban_user", adminName: req.adminUser.name, targetId: user.uniqueId, details: "User manually unbanned" }
    });
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/like", checkUserRestriction, async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.currentUser.id;
    let liked = true;
    try {
      const like = await prisma.like.create({
        data: { userId, postId },
        include: { user: { select: { name: true, avatar: true } }, post: { select: { userId: true } } }
      });
      if (like.post.userId !== userId) {
        prisma.notification.create({
          data: {
            userId: like.post.userId, senderId: userId, senderName: like.user.name,
            senderAvatar: like.user.avatar, type: "LIKE", postId: postId, content: "liked your post"
          }
        }).catch((err: any) => console.error("[NOTIFY ERROR]", err));
      }
    } catch (createError: any) {
      if (createError.code === 'P2002') {
        await prisma.like.delete({ where: { userId_postId: { userId, postId } } }).catch(() => {});
        liked = false;
      } else {
        throw createError;
      }
    }
    const likesCount = await prisma.like.count({ where: { postId } });
    res.json({ success: true, liked, likesCount });
  } catch (error: any) {
    res.status(500).json({ error: "Interaction synchronization failure." });
  }
});

app.get("/api/notifications/:userId", async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = await prisma.notification.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take: 50
    });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/:id/read", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/notifications/:userId/unread-count", async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/report", checkUserRestriction, async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    const { reason } = req.body;
    const userId = req.currentUser.id;

    const flag = await prisma.flaggedContent.create({
      data: { postId, userId, reason, status: "PENDING", priority: "MEDIUM" }
    });

    res.json({ success: true, flag });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users/:id/follow", checkUserRestriction, async (req: any, res: any) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.currentUser.id;
    if (followerId === followingId) return res.status(400).json({ error: "Cannot follow yourself" });
    const existing = await prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId, followingId } } });
    if (existing) {
      await prisma.userFollow.delete({ where: { id: existing.id } });
      
      // Notify for real-time count update
      const targetSocketId = userSockets.get(followingId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("notification", { type: "FOLLOW_UPDATE" });
      }

      res.json({ following: false });
    } else {
      await prisma.userFollow.create({ data: { followerId, followingId } });
      const sender = await prisma.user.findUnique({ where: { id: followerId } });
      
      await prisma.notification.create({
        data: {
          userId: followingId, senderId: followerId, senderName: sender?.name,
          senderAvatar: sender?.avatar, type: "FOLLOW", content: "started following you"
        }
      });

      // Real-time notification
      const targetSocketId = userSockets.get(followingId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("notification", { 
          type: "FOLLOW", 
          senderName: sender?.name,
          content: "started following you" 
        });
      }

      res.json({ following: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:id/profile", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const viewerId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"] as string) : null;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { posts: true, followers: true, following: true } }
      }
    });
    
    const posts = await prisma.post.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      include: { 
        user: true, 
        images: { select: { url: true, order: true } },
        _count: { select: { likes: true, comments: true, reposts: true } } 
      }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });

    let isFollowing = false;
    if (viewerId && viewerId !== id) {
      const follow = await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: id } }
      });
      isFollowing = !!follow;
    }

    res.json({ ...user, posts, isFollowing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/users/profile", upload.single("avatar"), checkUserRestriction, async (req: any, res: any) => {
  try {
    const { name, bio } = req.body;
    const userId = req.currentUser.id;
    let avatarUrl = req.currentUser.avatar;

    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer);
      avatarUrl = uploadResult.secure_url;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || req.currentUser.name,
        bio: bio || req.currentUser.bio,
        avatar: avatarUrl
      }
    });

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/messages/conversations/:userId", async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Efficiently get conversations with last message
    const rawConversations = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      include: { sender: true, receiver: true }
    });

    const conversationsMap = new Map();
    rawConversations.forEach((m: any) => {
      const otherUser = m.senderId === userId ? m.receiver : m.sender;
      if (!otherUser) return;
      if (!conversationsMap.has(otherUser.id)) {
        conversationsMap.set(otherUser.id, {
          ...otherUser,
          lastMessage: m.content || m.messageText,
          lastTimestamp: m.createdAt,
          unread: !m.isRead && m.receiverId === userId
        });
      }
    });

    conversationsMap.forEach((u, id) => {
      const isOnline = Date.now() - new Date(u.lastSeen).getTime() < 60000; // Online if active in last 1 min
      conversationsMap.set(id, { ...u, isOnline });
    });

    res.json(Array.from(conversationsMap.values()));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/messages/chat/:u1/:u2", async (req: any, res: any) => {
  try {
    const u1 = parseInt(req.params.u1);
    const u2 = parseInt(req.params.u2);
    const limit = parseInt(req.query.limit) || 50;
    const cursor = req.query.cursor ? { id: parseInt(req.query.cursor) } : undefined;

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: u1, receiverId: u2 }, { senderId: u2, receiverId: u1 }] },
      orderBy: { createdAt: "desc" }, // Fetch newest first for pagination
      take: limit,
      cursor: cursor,
      skip: cursor ? 1 : 0
    });

    // Mark as read
    await prisma.message.updateMany({
      where: { senderId: u2, receiverId: u1, isRead: false },
      data: { isRead: true }
    });

    res.json(messages.reverse()); // Flip back to chronological for UI
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/messages/send", checkUserRestriction, async (req: any, res: any) => {
  try {
    const { uniqueId, messageText } = req.body;
    const senderId = req.currentUser.id;
    const receiver = await prisma.user.findUnique({ where: { uniqueId } });
    if (!receiver) return res.status(404).json({ error: "Receiver not found" });
    const message = await prisma.message.create({
      data: { senderId, receiverId: receiver.id, content: messageText, messageText: messageText, isAnonymous: true }
    });
    await prisma.notification.create({
      data: { userId: receiver.id, senderId, type: "MESSAGE", content: "sent you an anonymous transmission signal." }
    });
    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/messages/send-v2", checkUserRestriction, async (req: any, res: any) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.currentUser.id;
    
    const message = await prisma.message.create({
      data: { 
        senderId, 
        receiverId: parseInt(receiverId), 
        content: content, 
        messageText: content 
      }
    });

    // Quick notification trigger
    prisma.notification.create({
      data: { 
        userId: parseInt(receiverId), 
        senderId, 
        type: "MESSAGE", 
        content: "sent you a message." 
      }
    }).catch((e: any) => console.error("Message Notify Error", e));

    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/scan", upload.single("image"), checkAdminMode, async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });
    const { phash } = await extractFeaturesFromBuffer(req.file.buffer);
    
    console.log(`\n[ADMIN SCAN RECEIVED] Extracted pHash for incoming scan image: ${phash}`);

    const matches = await getSimilarityResults({ phash });
    console.log(`[ADMIN SCAN RESULTS] Found ${matches.length} valid matches above 65% threshold.`);
    
    const formattedMatches = matches.map((m: any) => ({
       postId: m.post.id,
       previewUrl: m.post.imageUrl,
       similarity: `${Math.round(m.totalScore)}%`,
       confidenceLevel: m.confidenceLevel,
       matchType: m.matchType,
       user: m.post.user?.name || "Unknown"
    }));

    const resultObj = {
       matchCount: formattedMatches.length,
       bestMatch: formattedMatches.length > 0 ? formattedMatches[0] : null,
       allMatches: formattedMatches
    };

    res.json(resultObj);
  } catch (error: any) {
    console.error("[ADMIN SCAN ERROR]", error);
    res.status(500).json({ error: error.message || "Trace operation failed." });
  }
});

app.get("/api/users/search", async (req: any, res: any) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    const users = await prisma.user.findMany({
      where: { 
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { uniqueId: { contains: query, mode: "insensitive" } }
        ] 
      },
      take: 10
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/search", async (req: any, res: any) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    const posts = await prisma.post.findMany({
      where: { 
        OR: [
          { caption: { contains: query, mode: "insensitive" } }, 
          { location: { contains: query, mode: "insensitive" } }
        ] 
      },
      include: { 
        user: true, 
        images: { select: { url: true, order: true } },
        _count: { select: { likes: true, comments: true, reposts: true } } 
      },
      take: 20
    });
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/reset-similarities", checkAdminMode, async (req: any, res: any) => {
  try {
    await prisma.post.updateMany({ data: { phash: null } });
    res.json({ success: true, message: "Similarity data reset. Background processing will refill it." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/admin/delete/:id", checkAdminMode, async (req: any, res: any) => {
  try {
    const targetPostId = parseInt(req.params.id);
    const post = await prisma.post.findUnique({ where: { id: targetPostId } });
    
    if (!post) return res.status(404).json({ error: "Source post not found" });
    if (!post.phash) return res.status(400).json({ error: "Target post lacks a perceptual hash" });

    const matches = await getSimilarityResults({ phash: post.phash });
    const matchIds = matches.map((m: any) => m.post.id);

    // Make sure we encompass the origin post just in case it didn't pass its own filter for some reason (it should)
    if (!matchIds.includes(targetPostId)) matchIds.push(targetPostId);
    
    const deleteResult = await prisma.post.deleteMany({
      where: { id: { in: matchIds } }
    });

    await prisma.adminLog.create({
      data: {
        actionType: "global_delete_image",
        adminName: req.adminUser.name,
        targetId: post.uniqueId || `Post-${targetPostId}`,
        details: `Deleted ${deleteResult.count} variants from the network based on pHash thresholding.`
      }
    });

    res.json({ success: true, count: deleteResult.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/db-test", async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({ take: 5 });
    const posts = await prisma.post.findMany({ take: 5 });
    res.json({ users, posts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/flags", checkAdminMode, async (req: any, res: any) => {
  try {
    const flags = await prisma.flaggedContent.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { name: true, avatar: true } },
        post: { select: { imageUrl: true, caption: true, id: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(flags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/flags/:id/resolve", checkAdminMode, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const { action } = req.body; // "KEEP" | "WIPE"
    
    const flag = await prisma.flaggedContent.findUnique({ where: { id } });
    if (!flag) return res.status(404).json({ error: "Report not found" });

    if (action === "WIPE" && flag.postId) {
      await prisma.post.delete({ where: { id: flag.postId } }).catch(() => {});
      await prisma.adminLog.create({
        data: { actionType: "delete_flagged_post", adminName: req.adminUser.name, targetId: `Post-${flag.postId}`, details: `Deleted post due to report: ${flag.reason}` }
      });
    }

    await prisma.flaggedContent.update({
      where: { id },
      data: { status: action === "WIPE" ? "APPROVED" : "REJECTED" }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/logs", checkAdminMode, async (req: any, res: any) => {
  try {
    const logs = await prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req: any, res: any, next: any) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/admin")) {
     return res.status(404).json({ error: `Protocol ${req.originalUrl} not found.` });
  }
  next();
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[CRITICAL ERROR]", err);
  res.status(err.status || 500).json({ 
    error: "Internal protocol failure.",
    details: process.env.NODE_ENV === "development" ? err.message : undefined 
  });
});

async function startServer() {
  const distPath = path.join(process.cwd(), "..", "frontend", "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Socket.io Presence and Messaging

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("register", async (userId: number) => {
      userSockets.set(userId, socket.id);
      (socket as any).userId = userId;
      
      // Update last seen and online status
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() }
      }).catch(() => {});

      io.emit("userStatusUpdate", { userId, status: "online" });
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on("sendMessage", async (data: { receiverId: number; content: string }) => {
      const senderId = (socket as any).userId;
      if (!senderId) return;

      try {
        const message = await prisma.message.create({
          data: {
            senderId,
            receiverId: data.receiverId,
            content: data.content,
            messageText: data.content
          }
        });

        const receiverSocketId = userSockets.get(data.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", message);
        }
        
        // Also emit back to sender to confirm (or for multi-device sync)
        socket.emit("messageSent", message);

        // Create notification
        await prisma.notification.create({
          data: {
            userId: data.receiverId,
            senderId,
            type: "MESSAGE",
            content: "sent you a message."
          }
        }).catch(() => {});

      } catch (err) {
        console.error("Socket SendMessage Error:", err);
      }
    });

    socket.on("typing", (data: { receiverId: number; isTyping: boolean }) => {
      const senderId = (socket as any).userId;
      if (!senderId) return;

      const receiverSocketId = userSockets.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", { userId: senderId, isTyping: data.isTyping });
      }
    });

    socket.on("markAsRead", async (data: { senderId: number }) => {
      const receiverId = (socket as any).userId;
      if (!receiverId) return;

      await prisma.message.updateMany({
        where: { senderId: data.senderId, receiverId, isRead: false },
        data: { isRead: true }
      });

      const senderSocketId = userSockets.get(data.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", { readerId: receiverId });
      }
    });

    socket.on("disconnect", () => {
      const userId = (socket as any).userId;
      if (userId) {
        userSockets.delete(userId);
        io.emit("userStatusUpdate", { userId, status: "offline" });
        
        prisma.user.update({
          where: { id: userId },
          data: { lastSeen: new Date() }
        }).catch(() => {});
      }
      console.log("Socket disconnected:", socket.id);
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();