import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import sharp from "sharp";
import { imageHash } from "image-hash";

import { PrismaClient } from "@prisma/client";
import { createServer as createViteServer } from "vite";
import { uploadImage } from "./src/services/uploadService.js";
import { processImageAsync } from "./src/services/imageProcessingService.js";
import { calculateSimilarityScore } from "./src/services/imageSimilarityService.js";

function getImageHash(data: any): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(data, 16, true, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

const prisma = new PrismaClient() as any;
const app = express();
const PORT = 3001;

app.use(cors({ 
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    return callback(null, true); // In development, allow all origins specifically
  },
  credentials: true 
})); // FIX: Solve handshake/CORS issues
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

function generateUniqueId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "EH-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function hammingDistance(h1: string, h2: string) {
  let distance = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) distance++;
  }
  return distance;
}

async function getPHash(data: any): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(data, 16, true, (error: any, data: string) => {
      if (error) reject(error);
      resolve(data);
    });
  });
}
// --- MIDDLEWARES ---
const checkUserRestriction = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers["x-user-id"] || req.body.userId;
  if (!userId) return res.status(401).json({ error: "Please login to continue" });

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId as string) } });
    if (!user) return res.status(404).json({ error: "User not found" });

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
  } catch (error) {
    res.status(500).json({ error: "Server error" });
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
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// --- AUTH ---
app.post("/api/users/register", async (req, res) => {
  try {
    let { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and Email are required" });

    email = email.trim().toLowerCase();
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "An account with this email already exists." });

    const uniqueId = generateUniqueId();
    const user = await prisma.user.create({
      data: { name: name.trim(), email, uniqueId, avatar: `https://i.pravatar.cc/150?u=${email}` },
    });
    console.log(`[AUTH] New user registered: ${user.name} (${user.email})`);
    res.json(user);
  } catch (error: any) {
    console.error("[AUTH] Registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    email = email.trim().toLowerCase();
    console.log(`[AUTH] Login attempt for: ${email}`);

    const user = await prisma.user.findFirst({ 
      where: { 
        email: {
          equals: email,
          mode: 'insensitive'
        }
      } 
    });

    if (!user) {
      console.log(`[AUTH] User not found: ${email}`);
      return res.status(404).json({ error: "No account found with this email. Please sign up." });
    }

    console.log(`[AUTH] Login successful: ${user.name} (${user.id})`);
    res.json(user);
  } catch (error: any) {
    console.error("[AUTH] Login error:", error);
    res.status(400).json({ error: error.message });
  }
});

// --- POSTS ---
app.get("/api/posts", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;
    
    // REQUIREMENT 1: Safe x-user-id reading (treat as guest if missing or invalid)
    const xUserId = req.headers["x-user-id"];
    const currentUserId = xUserId ? parseInt(xUserId as string) : null;
    const isValidUser = currentUserId && !isNaN(currentUserId);

    // REQUIREMENT 2 & 3: Optimized query with conditional likes filter
    const selectFields: any = {
      id: true,
      imageUrl: true,
      caption: true,
      location: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          name: true,
          avatar: true,
          uniqueId: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          reposts: true
        }
      }
    };

    // Only include likes subquery if we have a valid user to check against
    if (isValidUser) {
      selectFields.likes = {
        where: { userId: currentUserId },
        select: { id: true }
      };
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

    // REQUIREMENT 4 & 5: Format response with isLiked and flat counts
    const formattedPosts = posts.map(post => ({
      id: post.id,
      imageUrl: post.imageUrl,
      caption: post.caption,
      location: post.location,
      createdAt: post.createdAt,
      user: post.user,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      repostsCount: post._count.reposts,
      // REQUIREMENT 4: isLiked boolean
      isLiked: isValidUser && post.likes ? post.likes.length > 0 : false
    }));

    // REQUIREMENT 5: Return proper format
    res.json({
      posts: formattedPosts,
      nextCursor
    });

  } catch (error: any) {
    console.error("[FEED ERROR]", error);
    res.status(500).json({ error: "Unable to retrieve network feed. Synchronization failure." });
  }
});

app.delete("/api/posts/:id", checkUserRestriction, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  
  const userId = req.currentUser.id;
  const userRole = req.currentUser.role;

  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Authorize: Owner or Admin
    if (post.userId !== userId && userRole !== "ADMIN") {
      return res.status(403).json({ error: "You can only delete your own posts." });
    }

    await prisma.post.delete({ where: { id } });
    res.json({ message: "Post deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/comment", checkUserRestriction, async (req: any, res) => {
  try {
    const { text } = req.body;
    const postId = parseInt(req.params.id);
    const userId = req.currentUser.id;

    if (!text) return res.status(400).json({ error: "Comment text is required" });

    const comment = await prisma.comment.create({
      data: {
        text,
        postId,
        userId
      },
      include: { user: true, post: { include: { user: true } } }
    });

    // Create Notification
    if (comment.post.userId !== userId) {
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
    }

    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts", checkUserRestriction, upload.single("image"), async (req: any, res) => {
  try {
    const { userId, caption, location, parentId } = req.body;
    if (!req.file && !parentId) return res.status(400).json({ error: "Image required" });

    let imagePath = "";
    let imageUrl = "";
    let sha256 = null;
    let phash = null;
    let hash = null;

    if (parentId) {
      const parent = await prisma.post.findUnique({ where: { id: parseInt(parentId) } });
      if (!parent) return res.status(404).json({ error: "Parent post not found" });
      imagePath = parent.imagePath;
      imageUrl = parent.imageUrl || "";
      sha256 = parent.sha256;
      phash = parent.phash || null;
      hash = parent.hash || null;
    } else {
      const uploadResult = await uploadImage(req.file.buffer);
      imageUrl = uploadResult.secure_url;
      imagePath = uploadResult.public_id;
    }

    const post = await prisma.post.create({
      data: {
        userId: parseInt(userId),
        caption,
        location: req.body.location || null,
        imagePath,
        imageUrl,
        sha256,
        phash,
        hash,
        parentId: parentId ? parseInt(parentId) : null,
      } as any,
      select: { id: true, userId: true, imageUrl: true, caption: true, createdAt: true, user: { select: { name: true } } }
    });
    
    // REQUIREMENT: Send response IMMEDIATELY
    res.json({
      success: true,
      post: {
        id: post.id,
        imageUrl: post.imageUrl,
        caption: post.caption,
        user: post.user,
        createdAt: post.createdAt,
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        isLiked: false
      }
    });

    // BACKGROUND: Heavy similarity processing
    if (!parentId) {
      processImageAsync(post.id, post.imageUrl!).catch(err => {
        console.error(`Failed to trigger async processing for post ${post.id}`, err);
      });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SEARCH & TRACKING ---
app.post("/api/posts/search", upload.single("image"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const phash = await getPHash({ data: req.file.buffer, name: req.file.originalname });

    const allPosts = await prisma.post.findMany({ include: { user: true } });
    const results = allPosts
      .map((p) => ({ ...p, distance: hammingDistance(phash, p.phash) }))
      .filter((p) => p.distance < 10)
      .sort((a, b) => a.distance - b.distance);

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/:id/chain", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Find all posts with same SHA256 (exact) or similar pHash
    const related = await prisma.post.findMany({
      where: {
        OR: [
          { sha256: post.sha256 },
          { parentId: post.id },
          { id: post.parentId || -1 }
        ]
      },
      include: { user: true }
    });
    res.json(related);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/posts/:id/related", checkUserRestriction, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const deleted = await prisma.post.deleteMany({
      where: {
        OR: [
          { sha256: post.sha256 },
          { phash: post.phash }
        ]
      }
    });
    res.json({ message: `Deleted ${deleted.count} related posts` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- LOST & FOUND ---
app.post("/api/messages/send", checkUserRestriction, async (req, res) => {
  try {
    const { uniqueId, messageText } = req.body;
    const user = await prisma.user.findUnique({ where: { uniqueId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const message = await prisma.message.create({
      data: { receiverId: user.id, messageText },
    });
    res.json({ success: true, message });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/messages/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const messages = await prisma.message.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

async function findSimilarPostsToDelete(targetSha256: string, targetPhash: string, targetHash: string) {
  const allPosts = await prisma.post.findMany();
  const matchedData: { id: number, matchType: string, distance: number }[] = [];

  for (const post of allPosts) {
    let matchType = "";
    let distance = 100;

    if (post.sha256 === targetSha256) {
      matchType = "SHA-256 (EXACT)";
      distance = 0;
    } else if (post.hash === targetHash) {
      matchType = "IMAGE-HASH (STRONG)";
      distance = 2;
    } else {
      const d = hammingDistance(post.phash, targetPhash);
      if (d < 10) {
        matchType = "P-HASH (VARIANT)";
        distance = d;
      }
    }

    if (matchType) {
      matchedData.push({ id: post.id, matchType, distance });
    }
  }
  return matchedData;
}

// --- ADMIN SYSTEM ---
app.get("/admin/stats", checkAdminMode, async (req, res) => {
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

app.get("/admin/users", checkAdminMode, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'desc' },
      include: {
        _count: { select: { posts: true } }
      }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/users/:id/ban", checkAdminMode, async (req: any, res) => {
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
      data: {
        status,
        banUntil,
        banReason: reason,
        isRestricted: true,
        banCount: { increment: 1 }
      }
    });

    await prisma.adminLog.create({
      data: { actionType: "ban_user", adminName: req.adminUser.name, targetId: user.uniqueId, details: `Ban duration: ${durationDays} days. Reason: ${reason}` }
    });

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/find-image", checkAdminMode, upload.single("image"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    
    // Hash the uploaded image
    const hashData = { data: req.file.buffer, name: req.file.originalname };
    const phash = await getPHash(hashData);
    const hash = await getImageHash(hashData);
    
    const existingPosts = await prisma.post.findMany();
    
    let bestMatch = null;
    let highestScore = 0;
    let matchCount = 0;

    for (const p of existingPosts) {
      if (!p.phash && !p.hash) continue;
      
      const score = calculateSimilarityScore(
        { phash, dhash: hash },
        { phash: p.phash, dhash: p.hash }
      );
      
      if (score >= 0.65) {
        matchCount++;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = p;
        }
      }
    }

    if (!bestMatch) {
      return res.json({ matchCount: 0 });
    }

    res.json({
      matchCount,
      postId: bestMatch.id,
      similarity: (highestScore * 100).toFixed(1) + "%",
      matchType: highestScore > 0.85 ? "STRONG MATCH" : "POSSIBLE MATCH",
      previewUrl: bestMatch.imageUrl || `/uploads/${bestMatch.imagePath}`
    });

  } catch (error: any) {
    console.error("Deep scan error:", error);
    res.status(500).json({ error: "Network handshake failure" });
  }
});


app.post("/admin/users/:id/unban", checkAdminMode, async (req: any, res) => {
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

app.post("/api/posts/:id/like", checkUserRestriction, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.currentUser.id;

    // Fast Response Pattern: Send success IMMEDIATELY
    res.json({ success: true, liked: true });

    // Background Processing: No await for non-critical side effects
    (async () => {
      try {
        const like = await prisma.like.create({ 
          data: { userId, postId },
          select: { user: { select: { name: true, avatar: true } }, post: { select: { userId: true } } }
        });

        // Trigger notification asynchronously
        if (like.post.userId !== userId) {
          await prisma.notification.create({
            data: {
              userId: like.post.userId,
              senderId: userId,
              senderName: like.user.name,
              senderAvatar: like.user.avatar,
              type: "LIKE",
              postId: postId,
              content: "liked your post"
            }
          });
        }
      } catch (createError: any) {
        // If Unique constraint fails -> Toggle: DELETE the like
        if (createError.code === 'P2002') {
          await prisma.like.delete({
            where: { userId_postId: { userId, postId } }
          }).catch(() => {}); // Catch silent delete failures
        }
      }
    })().catch(err => console.error("[ASYNC LIKE ERROR]", err));

  } catch (error: any) {
    console.error("[LIKE API ERROR]", error);
  }
});

// --- NOTIFICATIONS ---
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/notifications/:userId/unread-count", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- FOLLOWS ---
app.post("/api/users/:id/follow", checkUserRestriction, async (req: any, res) => {
  try {
    const followingId = parseInt(req.params.id);
    const followerId = req.currentUser.id;

    if (followerId === followingId) return res.status(400).json({ error: "Cannot follow yourself" });

    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } }
    });

    if (existing) {
      await prisma.userFollow.delete({ where: { id: existing.id } });
      res.json({ following: false });
    } else {
      await prisma.userFollow.create({
        data: { followerId, followingId }
      });
      // Create Notification
      const sender = await prisma.user.findUnique({ where: { id: followerId } });
      await prisma.notification.create({
        data: {
          userId: followingId,
          senderId: followerId,
          senderName: sender?.name,
          senderAvatar: sender?.avatar,
          type: "FOLLOW",
          content: "started following you"
        }
      });
      res.json({ following: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- USER PROFILE ---
app.get("/api/users/:id/profile", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        },
        posts: {
          orderBy: { createdAt: "desc" },
          include: { 
            user: true,
            _count: { select: { likes: true, comments: true, reposts: true } }
          }
        }
      }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ENHANCED MESSAGING ---
app.get("/api/messages/conversations/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    // Find unique users that the current user has chatted with
    const sent = await prisma.message.findMany({
      where: { senderId: userId },
      include: { receiver: true },
      distinct: ['receiverId']
    });
    const received = await prisma.message.findMany({
      where: { receiverId: userId },
      include: { sender: true },
      distinct: ['senderId']
    });

    const usersMap = new Map();
    sent.forEach(m => {
      if (m.receiver) usersMap.set(m.receiver.id, m.receiver);
    });
    received.forEach(m => {
      if (m.sender) usersMap.set(m.sender.id, m.sender);
    });

    const conversations = Array.from(usersMap.values());
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/messages/chat/:u1/:u2", async (req, res) => {
  try {
    const u1 = parseInt(req.params.u1);
    const u2 = parseInt(req.params.u2);
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: u1, receiverId: u2 },
          { senderId: u2, receiverId: u1 }
        ]
      },
      orderBy: { createdAt: "asc" }
    });
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/messages/send-v2", checkUserRestriction, async (req: any, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.currentUser.id;

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: parseInt(receiverId),
        content,
        messageText: content // for back-compat
      }
    });
    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});app.post("/api/messages/send", checkUserRestriction, async (req: any, res) => {
  try {
    const { uniqueId, messageText } = req.body;
    const senderId = req.currentUser.id;

    const receiver = await prisma.user.findUnique({ where: { uniqueId } });
    if (!receiver) return res.status(404).json({ error: "Receiver not found" });

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: receiver.id,
        content: messageText,
        messageText: messageText,
        isAnonymous: true
      }
    });

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: receiver.id,
        senderId,
        type: "MESSAGE",
        content: "sent you an anonymous transmission signal."
      }
    });

    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/report", checkUserRestriction, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.currentUser.id;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Reason required" });
    
    // Auto-prioritize Harassment
    const priority = reason === "Harassment" ? "HIGH" : 
                     reason === "Inappropriate Content" ? "MEDIUM" : "LOW";
                     
    const flag = await prisma.flaggedContent.create({
      data: { postId, userId, reason, priority, status: "PENDING" }
    });
    res.json(flag);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/admin/users/:id", checkAdminMode, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id }});
    if (!user) return res.status(404).json({error: "User not found"});

    await prisma.user.delete({ where: { id } });
    await prisma.adminLog.create({
      data: { actionType: "delete_user", adminName: req.adminUser.name, targetId: user.uniqueId, details: "User and all related records deleted" }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/flags", checkAdminMode, async (req, res) => {
  try {
    const flags = await prisma.flaggedContent.findMany({
      where: { status: "PENDING" },
      include: { post: true, user: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(flags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/flags/:id/resolve", checkAdminMode, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { action } = req.body; // "KEEP" or "WIPE"
    
    const flag = await prisma.flaggedContent.findUnique({ where: { id }, include: { post: true } });
    if (!flag) return res.status(404).json({ error: "Flag not found" });

    if (action === "KEEP") {
      await prisma.flaggedContent.update({ where: { id }, data: { status: "REJECTED" } });
      await prisma.adminLog.create({
         data: { actionType: "keep_flagged_post", adminName: req.adminUser.name, targetId: flag.postId?.toString(), details: "Report dismissed" }
      });
      return res.json({ success: true, message: "Post kept, flag dismissed." });
    } else if (action === "WIPE") {
      if (!flag.post) return res.status(404).json({ error: "Original post no longer exists." });
      const post = flag.post;
      // We fall back to standard image hash/sha256 matching for wipes
      const matchedData = await findSimilarPostsToDelete(post.sha256, post.phash || "", post.hash || "");
      if(matchedData.length > 0) {
          const matchedIds = matchedData.map(m => m.id);
          const deleted = await prisma.post.deleteMany({ where: { id: { in: matchedIds } } });
          await prisma.flaggedContent.update({ where: { id }, data: { status: "APPROVED" } });
          await prisma.adminLog.create({
             data: { actionType: "wipe_flagged_content", adminName: req.adminUser.name, targetId: post.id.toString(), details: `Deleted ${deleted.count} variants` }
          });
          return res.json({ success: true, message: `Wiped ${deleted.count} posts globally.` });
      } else {
          return res.status(404).json({ error: "Could not find posts to wipe." });
      }
    }
    
    res.status(400).json({ error: "Invalid action" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/logs", checkAdminMode, async (req, res) => {
  try {
    const logs = await prisma.adminLog.findMany({ orderBy: { createdAt: "desc" }});
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Refactored Image Deletion to use checkAdminMode
app.post("/admin/find-image", checkAdminMode, upload.single("image"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const targetSha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const targetPhash = await getPHash(req.file.path);
    const targetHash = await getImageHash(req.file.path);

    const matchedData = await findSimilarPostsToDelete(targetSha256, targetPhash, targetHash);
    fs.unlinkSync(req.file.path);

    if (matchedData.length === 0) {
      return res.json({ postId: null, matchCount: 0, previewUrl: null });
    }

    const representativePost = await prisma.post.findUnique({ where: { id: matchedData[0].id }, include: { user: true } });
    const similarity = Math.max(0, 100 - (matchedData[0].distance * 2)); // Dynamic similarity logic
    
    res.json({ 
      postId: representativePost?.id, 
      matchCount: matchedData.length, 
      previewUrl: `/uploads/${representativePost?.imagePath}`,
      matchType: matchedData[0].matchType,
      similarity: `${similarity}%`
    });
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "Failed to process image analysis." });
  }
});

app.delete("/admin/delete/:id", checkAdminMode, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  try {
    const targetPost = await prisma.post.findUnique({ where: { id } });
    if (!targetPost) return res.status(404).json({ error: "Post not found" });

    const matchedData = await findSimilarPostsToDelete(targetPost.sha256, targetPost.phash, targetPost.hash);
    if (matchedData.length === 0) return res.status(404).json({ error: "No matching images found to delete." });

    const matchedIds = matchedData.map(m => m.id);
    const deleted = await prisma.post.deleteMany({ where: { id: { in: matchedIds } } });

    await prisma.adminLog.create({
      data: { actionType: "global_delete_image", adminName: req.adminUser.name, targetId: targetPost.id.toString(), details: `Number of deleted posts: ${deleted.count}` }
    });

    res.json({ message: `Successfully deleted ${deleted.count} posts globally.` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process image deletion." });
  }
});

app.get("/db-test", async (req, res) => {
  try {
    const users = await prisma.user.findMany({ take: 5 });
    const posts = await prisma.post.findMany({ take: 5 });
    res.json({ users, posts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
