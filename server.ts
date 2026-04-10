import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import sharp from "sharp";
import opencv from "opencv-wasm";
const { cv } = opencv;
import { imageHash } from "image-hash";
import { PrismaClient } from "@prisma/client";
import { createServer as createViteServer } from "vite";
function getImageHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

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

async function getPHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error: any, data: string) => {
      if (error) reject(error);
      resolve(data);
    });
  });
}
// --- MIDDLEWARES ---
const checkUserRestriction = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers["x-user-id"] || req.body.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId as string) } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.status === "BANNED" && user.banUntil && new Date() > user.banUntil) {
       await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", isRestricted: false, banUntil: null } });
       user.status = "ACTIVE";
       user.isRestricted = false;
    }

    if (user.status === "BANNED" || user.status === "PERMANENT_BAN" || user.isRestricted) {
      return res.status(403).json({ error: "Your account is currently restricted from this action." });
    }
    
    (req as any).currentUser = user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const checkAdminMode = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId as string) } });
    if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "Admin access required." });
    
    (req as any).adminUser = user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// --- AUTH ---
app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email } = req.body;
    const uniqueId = generateUniqueId();
    const user = await prisma.user.create({
      data: { name, email, uniqueId, avatar: `https://i.pravatar.cc/150?u=${email}` },
    });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- POSTS ---
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
      return res.status(403).json({ error: "Unauthorized: You can only delete your own posts." });
    }

    await prisma.post.delete({ where: { id } });
    res.json({ message: "Post deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts", checkUserRestriction, upload.single("image"), async (req: any, res) => {
  try {
    const { userId, caption, parentId } = req.body;
    if (!req.file && !parentId) return res.status(400).json({ error: "Image required" });

    let imagePath = "";
    let sha256 = "";
    let phash = "";
    let hash = "";

    if (parentId) {
      const parent = await prisma.post.findUnique({ where: { id: parseInt(parentId) } });
      if (!parent) return res.status(404).json({ error: "Parent post not found" });
      imagePath = parent.imagePath;
      sha256 = parent.sha256;
      phash = parent.phash;
      hash = parent.hash;
    } else {
      imagePath = req.file.filename;
      const fileBuffer = fs.readFileSync(req.file.path);
      sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      phash = await getPHash(req.file.path);
      hash = await getImageHash(req.file.path);
    }

    const post = await prisma.post.create({
      data: {
        userId: parseInt(userId),
        caption,
        imagePath,
        sha256,
        phash,
        hash,
        parentId: parentId ? parseInt(parentId) : null,
      },
      include: { user: true }
    });
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SEARCH & TRACKING ---
app.post("/api/posts/search", upload.single("image"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });
    const phash = await getPHash(req.file.path);
    fs.unlinkSync(req.file.path);

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
  const matchedIds: number[] = [];

  for (const post of allPosts) {
    if (
      post.sha256 === targetSha256 ||
      post.hash === targetHash ||
      hammingDistance(post.phash, targetPhash) < 10
    ) {
      matchedIds.push(post.id);
    }
  }
  return matchedIds;
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

app.post("/api/posts/:id/like", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } }
    });
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      res.json({ success: true, liked: false });
    } else {
      await prisma.like.create({ data: { userId, postId } });
      res.json({ success: true, liked: true });
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/comment", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { text, userId } = req.body;
    if (!text || !userId) return res.status(400).json({ error: "Missing text or userId" });
    const comment = await prisma.comment.create({
      data: { text, userId, postId },
      include: { user: true }
    });
    res.json(comment);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/report", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { userId, reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Reason required" });
    
    // Auto-prioritize Harassment
    const priority = reason === "Harassment" ? "HIGH" : 
                     reason === "Inappropriate Content" ? "MEDIUM" : "LOW";
                     
    const flag = await prisma.flaggedContent.create({
      data: { postId, userId: userId || null, reason, priority, status: "PENDING" }
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
      const matchedIds = await findSimilarPostsToDelete(post.sha256, post.phash || "", post.hash || "");
      if(matchedIds.length > 0) {
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

    const matchedIds = await findSimilarPostsToDelete(targetSha256, targetPhash, targetHash);
    fs.unlinkSync(req.file.path);

    if (matchedIds.length === 0) {
      return res.json({ postId: null, matchCount: 0, previewUrl: null });
    }

    const representativePost = await prisma.post.findUnique({ where: { id: matchedIds[0] }, include: { user: true } });
    res.json({ postId: representativePost?.id, matchCount: matchedIds.length, previewUrl: `/uploads/${representativePost?.imagePath}` });
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

    const matchedIds = await findSimilarPostsToDelete(targetPost.sha256, targetPost.phash, targetPost.hash);
    if (matchedIds.length === 0) return res.status(404).json({ error: "No matching images found to delete." });

    const deleted = await prisma.post.deleteMany({ where: { id: { in: matchedIds } } });

    await prisma.adminLog.create({
      data: { actionType: "global_delete_image", adminName: req.adminUser.name, targetId: targetPost.id.toString(), details: `Number of deleted posts: ${deleted.count}` }
    });

    res.json({ message: `Successfully deleted ${deleted.count} posts globally.` });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process image deletion." });
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
