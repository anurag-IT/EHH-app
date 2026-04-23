import "dotenv/config";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import fs from "fs";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

import { PrismaClient } from "@prisma/client";
import { uploadImage } from "./src/services/uploadService.js";
import { processImageAsync, extractFeaturesFromBuffer } from "./src/services/imageProcessingService.js";
import { getSimilarityResults } from "./src/services/imageSimilarityService.js";

import { createServer } from "http";
import { Server } from "socket.io";

const prisma = new PrismaClient() as any;
const app = express();
const httpServer = createServer(app);

// --- CORS Whitelist ---
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGINS,
  process.env.FRONTEND_URL?.endsWith('/') ? process.env.FRONTEND_URL.slice(0, -1) : null,
  process.env.ALLOWED_ORIGINS?.endsWith('/') ? process.env.ALLOWED_ORIGINS.slice(0, -1) : null
].filter(Boolean) as string[];

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  }
});
const PORT = Number(process.env.PORT) || 3001;

// --- Security Middleware ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // disabled — frontend served from same origin
}));

app.use(cors({
  origin: (origin: any, callback: any) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize()); // strips $ and . from req.body to prevent injection
app.use(compression() as any);

// --- Rate Limiting ---
// General API limiter — 200 requests per minute per IP
const generalLimiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use("/api", generalLimiter);

// Auth/Login limiter — 20 attempts per 15 minutes
const loginLimiter = rateLimit({ 
  windowMs: 15 * 60_000, 
  max: 20,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10 });
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hour window
  max: 100, // Increased for development/testing convenience
  message: { error: "Too many reset requests. Please try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false
});

// Upload limiter — 20 uploads per 10 minutes per IP
const uploadLimiter = rateLimit({ windowMs: 10 * 60_000, max: 20 });

// --- Real-time Tracking ---
const userSockets = new Map<number, string>(); // userId -> socketId

// --- Simple Cache Implementation ---
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

// Performance optimization: Throttle lastSeen updates and cache user sessions
const lastSeenThrottle = new Map<number, number>();
const userSessionCache = new Map<number, { user: any, cachedAt: number }>();

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

const getUserIdFromRequest = (req: express.Request): number | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      if (!process.env.JWT_SECRET) return null;
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
      return decoded.userId;
    } catch (e) {
      return null;
    }
  }
  return null;
};


function generateUniqueId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "EH-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const checkUserRestriction = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Please login to continue" });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number, role: string };
    const id = decoded.userId;

    if (isNaN(id)) return res.status(401).json({ error: "Invalid user session" });
    
    // 1. User Session Cache (30s TTL) to avoid DB hitting on every request
    let cached = userSessionCache.get(id);
    let user = cached && (Date.now() - cached.cachedAt < 30000) ? cached.user : null;

    if (!user) {
      user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: "User not found" });
      userSessionCache.set(id, { user, cachedAt: Date.now() });
    }

    // 2. Throttle lastSeen update to once per minute
    const lastSeen = lastSeenThrottle.get(id);
    if (!lastSeen || (Date.now() - lastSeen > 60000)) {
       prisma.user.update({ where: { id }, data: { lastSeen: new Date() } }).catch(() => {});
       lastSeenThrottle.set(id, Date.now());
    }

    if (user.status === "BANNED" && user.banUntil && new Date() > user.banUntil) {
       await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE", isRestricted: false, banUntil: null } });
       user.status = "ACTIVE";
       user.isRestricted = false;
       userSessionCache.delete(id); // Invalidate cache after status change
    }

    if (user.status === "BANNED" || user.status === "PERMANENT_BAN" || user.isRestricted) {
      return res.status(403).json({ error: "Your account is currently blocked." });
    }
    
    (req as any).user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired. Please login again." });
    }
    res.status(401).json({ error: "Invalid or missing token session" });
  }
};

const checkAdminMode = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Please login" });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number, role: string, name?: string };

    if (decoded.role !== "ADMIN") return res.status(403).json({ error: "Admin access is needed." });
    
    // Do not hit DB: use data from JWT
    (req as any).adminUser = { id: decoded.userId, role: decoded.role, name: decoded.name || "Admin" };
    next();
  } catch (error: any) {
    res.status(401).json({ error: "Invalid admin session" });
  }
};

const adminKeyMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    console.warn(`[ADMIN ACCESS DENIED] Received key: ${key}, Expected: ${process.env.ADMIN_SECRET_KEY}`);
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
app.use('/admin', adminKeyMiddleware);

app.post("/api/users/register", authLimiter, async (req: any, res: any) => {
  try {
    let { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    email = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "An account with this email already exists." });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const uniqueId = generateUniqueId();
    const user = await prisma.user.create({
      data: { 
        name: name.trim(), 
        email, 
        password: passwordHash,
        uniqueId, 
        avatar: `https://i.pravatar.cc/150?u=${email}` 
      },
      select: {
        id: true,
        name: true,
        email: true,
        uniqueId: true,
        avatar: true,
        role: true,
        status: true
      }
    });
    res.json(user);
  } catch (error: any) {
    console.error("[REGISTER ERROR]", error);
    res.status(400).json({ error: error.message || "Registration failed" });
  }
});

app.post("/api/users/login", loginLimiter, async (req: any, res: any) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    
    email = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({ 
      where: { email } 
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(400).json({ 
        error: "Reset password required", 
        resetRequired: true 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment");
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error: any) {
    console.error("[LOGIN ERROR]", error);
    res.status(500).json({ error: `Login error: ${error.message}` });
  }
});


app.post("/api/users/forgot-password", forgotPasswordLimiter, async (req: any, res: any) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Security: return 200 even if not found to prevent email scanning
      return res.status(200).json({ message: "If that email exists, an OTP has been sent." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Save to DB (15 minute expiration) and reset tracking limits
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: hashedOtp,
        resetOtpExpiry: new Date(Date.now() + 15 * 60 * 1000),
        resetOtpAttempts: 0,
        resetOtpLockedAt: null
      }
    });

    // Send the email OR log to console if no SMTP is configured
    try {
      if (resend) {
        await resend.emails.send({
          from: 'EHH Security <onboarding@resend.dev>', // Resend sandbox email for testing
          to: user.email,
          subject: 'Your EHH Password Reset Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">EHH — Password Reset</h2>
              <p>Your one-time password reset code is:</p>
              <div style="background: #F3F4F6; padding: 24px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="font-size: 36px; letter-spacing: 8px; color: #111827; margin: 0;">${otp}</h1>
              </div>
              <p style="color: #6B7280;">This code expires in <strong>15 minutes</strong>. Do not share it with anyone.</p>
              <p style="color: #6B7280; font-size: 12px;">If you didn't request this, ignore this email.</p>
            </div>
          `
        });
      }
    } catch (emailError: any) {
      console.error("[EMAIL SENDING ERROR]", emailError);
      // We don't throw the error here so the user gets a 200 response
      // and can still find the OTP in the server logs for development.
    }
    
    // Always log to terminal in development for easy access
    console.log(`\n\n[OTP DEBUG] Code for ${user.email} is: ${otp}\n\n`);

    res.status(200).json({ message: "If that email exists, an OTP has been sent." });
  } catch (error: any) {
    console.error("[FORGOT PASSWORD ERROR]", error);
    res.status(500).json({ error: `Reset failure: ${error.message}` });
  }
});

app.post("/api/users/verify-otp", async (req: any, res: any) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user || !user.resetOtp || !user.resetOtpExpiry || new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Check if OTP is locked (5 failed attempts = 30 min lockout)
    if (user.resetOtpLockedAt && new Date() < new Date(user.resetOtpLockedAt.getTime() + 30 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many failed attempts. Try again in 30 minutes." });
    }

    const isValidOtp = await bcrypt.compare(otp, user.resetOtp);
    if (!isValidOtp) {
      const newAttempts = (user.resetOtpAttempts || 0) + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetOtpAttempts: newAttempts,
          resetOtpLockedAt: newAttempts >= 5 ? new Date() : null
        }
      });
      const remaining = 5 - newAttempts;
      return res.status(400).json({ 
        error: remaining > 0 ? `Invalid OTP. ${remaining} attempts remaining.` : "Account locked. Try again in 30 minutes." 
      });
    }

    // Reset attempt counter on successful verify
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtpAttempts: 0,
        resetOtpLockedAt: null
      }
    });

    res.status(200).json({ message: "OTP Verified" });
  } catch (error: any) {
    res.status(500).json({ error: "Verification failed" });
  }
});

app.post("/api/users/reset-password", async (req: any, res: any) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }

    if (!user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ error: "No active reset request found for this email." });
    }

    // Check expiration
    if (new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Check if OTP is locked (5 failed attempts = 30 min lockout)
    if (user.resetOtpLockedAt && new Date() < new Date(user.resetOtpLockedAt.getTime() + 30 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many failed attempts. Try again in 30 minutes." });
    }

    // Validate OTP - ensuring otp is treated as string for bcrypt
    const isValidOtp = await bcrypt.compare(otp.toString(), user.resetOtp);
    if (!isValidOtp) {
      const newAttempts = (user.resetOtpAttempts || 0) + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetOtpAttempts: newAttempts,
          resetOtpLockedAt: newAttempts >= 5 ? new Date() : null
        }
      });
      const remaining = 5 - newAttempts;
      return res.status(400).json({ 
        error: remaining > 0 ? `Invalid OTP. ${remaining} attempts remaining.` : "Account locked. Try again in 30 minutes." 
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update the password and clear the OTP fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetOtp: null,
        resetOtpExpiry: null
      }
    });

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error: any) {
    console.error("[RESET PASSWORD ERROR]", error);
    res.status(500).json({ error: `Reset error: ${error.message}` });
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

app.put("/api/users/profile", upload.array("images", 1), checkUserRestriction, async (req: any, res: any) => {
  try {
    const { name, bio, isPrivate } = req.body;
    const userId = req.user.id;
    const files = req.files as any[];
    let avatarUrl = req.user.avatar;

    if (files && files.length > 0) {
      const uploadResult = await uploadImage(files[0].buffer);
      avatarUrl = uploadResult.secure_url;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || req.user.name,
        bio: bio !== undefined ? bio : req.user.bio,
        isPrivate: isPrivate === "true" || isPrivate === true,
        avatar: avatarUrl
      }
    });
    userSessionCache.delete(userId);
    // Clear profile caches for all viewers
    for (const key of cache.keys()) {
      if (key.startsWith(`profile_${userId}_`)) {
        cache.delete(key);
      }
    }
    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users/requests/:requestId/accept", checkUserRestriction, async (req: any, res: any) => {
  try {
     const requestId = parseInt(req.params.requestId);
     const request = await prisma.userFollow.findUnique({ where: { id: requestId } });
     if (!request || request.followingId !== req.user.id) return res.status(403).json({ error: "Access denied" });

     await prisma.userFollow.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
     
     // Notify the follower
     await prisma.notification.create({
       data: {
         userId: request.followerId,
         senderId: req.user.id,
         senderName: req.user.name,
         senderAvatar: req.user.avatar,
         type: "FOLLOW_ACCEPTED",
         content: "accepted your follow request"
       }
     });

     res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/users/requests/:requestId/reject", checkUserRestriction, async (req: any, res: any) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const request = await prisma.userFollow.findUnique({ where: { id: requestId } });
    if (!request || request.followingId !== req.user.id) return res.status(403).json({ error: "Access denied" });
    await prisma.userFollow.delete({ where: { id: requestId } });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
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
    const currentUserId = getUserIdFromRequest(req);
    const isValidUser = currentUserId !== null;

    // Cache key based on query params and user
    const cacheKey = `posts_${limit}_${cursor || 'start'}_${currentUserId || 'guest'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    const selectFields: any = {
      id: true, imageUrl: true, imageUrls: true, caption: true, location: true, createdAt: true, userId: true,
      user: { select: { name: true, avatar: true, uniqueId: true } },
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

    const followedAuthors = isValidUser ? (await prisma.userFollow.findMany({
      where: { followerId: currentUserId, followingId: { in: posts.map((p: any) => p.userId) } },
      select: { followingId: true, status: true }
    })) : [];

    const formattedPosts = posts.map((post: any) => {
      const follow = followedAuthors.find((f: any) => f.followingId === post.userId);
      return {
        ...post,
        imageUrls: post.imageUrls || [],
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        repostsCount: post._count.reposts,
        isLiked: isValidUser && post.likes ? post.likes.length > 0 : false,
        isFollowing: !!follow && follow.status === 'ACCEPTED',
        followStatus: follow?.status || null
      };
    });

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
  const userId = req.user.id;
  const userRole = req.user.role;
  console.log(`[ADMIN DELETE] Request to delete post ${id} by user ${userId} (Role: ${userRole})`);
  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.userId !== userId && userRole !== "ADMIN") return res.status(403).json({ error: "You can only delete your own posts." });
    // Manual cleanup for relations to bypass all possible foreign key blocks
    await prisma.like.deleteMany({ where: { postId: id } });
    await prisma.comment.deleteMany({ where: { postId: id } });
    await prisma.flaggedContent.deleteMany({ where: { postId: id } });
    await prisma.post.deleteMany({ where: { parentId: id } });
    // Cleanup similarity matches
    await prisma.imageMatch.deleteMany({ where: { OR: [{ imageId: id }, { matchedImageId: id }] } });

    // Use deleteMany even for single ID to be more robust against Prisma relation cache issues
    const del = await prisma.post.deleteMany({ where: { id } });
    
    console.log(`[STATUS] Deleted ${del.count} post and its branches.`);
    // Important: Clear cache so the feed reflects the deletion immediately
    cache.clear();
    res.json({ success: true, message: "Post and branches erased successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/comment", checkUserRestriction, async (req: any, res: any) => {
  try {
    const { text } = req.body;
    const postId = parseInt(req.params.id);
    const userId = req.user.id;
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

app.post("/api/stories", uploadLimiter, upload.array("images", 1), checkUserRestriction, async (req: any, res: any) => {
  try {
    const userId = req.body.userId || req.user.id;
    const { caption, textColor, bgColor, stickers } = req.body;
    const files = req.files as any[];

    let imageUrl = "";
    let imagePath = "";

    if (files && files.length > 0) {
      console.log(`[STORY UPLOAD] User ${userId} broadcasting visual signal...`);
      const uploadResult = await uploadImage(files[0].buffer);
      imageUrl = uploadResult.secure_url;
      imagePath = uploadResult.public_id;
    } else if (!bgColor) {
      return res.status(400).json({ error: "Visual asset or background parameters required" });
    }
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await prisma.story.create({
      data: {
        userId: parseInt(userId),
        imageUrl: imageUrl,
        imagePath: imagePath,
        caption,
        textColor,
        bgColor,
        stickers: stickers ? JSON.parse(stickers) : null,
        expiresAt
      },
      include: { user: true }
    });

    console.log(`[STORY SUCCESS] Story ${story.id} indexed.`);
    res.json(story);
  } catch (error: any) {
    console.error("[STORY ERROR]", error);
    res.status(500).json({ error: error.message || "Internal story indexing failure" });
  }
});

app.get("/api/stories", async (req: any, res: any) => {
  try {
    const currentUserId = getUserIdFromRequest(req);
    const now = new Date();

    let stories;
    const includeQuery: any = {
      user: { select: { id: true, name: true, avatar: true } },
      _count: { select: { reactions: true, views: true, replies: true } }
    };

    if (currentUserId) {
      includeQuery.reactions = { where: { userId: currentUserId }, select: { emoji: true } };
      
      const following = await prisma.userFollow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true }
      });
      const followingIds = following.map((f: any) => f.followingId);
      followingIds.push(currentUserId);

      stories = await prisma.story.findMany({
        where: { userId: { in: followingIds }, expiresAt: { gt: now } },
        include: includeQuery,
        orderBy: { createdAt: "desc" }
      });
    } else {
      stories = await prisma.story.findMany({
        where: { expiresAt: { gt: now } },
        include: includeQuery,
        orderBy: { createdAt: "desc" },
        take: 50
      });
    }

    const formattedStories = stories.map((s: any) => ({
      ...s,
      myReaction: s.reactions?.[0]?.emoji || null,
      reactionsCount: s._count.reactions,
      viewsCount: s._count.views,
      repliesCount: s._count.replies
    }));

    const grouped = formattedStories.reduce((acc: any, story: any) => {
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

app.post("/api/stories/:id/view", checkUserRestriction, async (req: any, res: any) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.user.id;
    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      update: { viewedAt: new Date() },
      create: { storyId, userId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/stories/:id/react", checkUserRestriction, async (req: any, res: any) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.user.id;
    const { emoji } = req.body;

    const existing = await prisma.storyReaction.findUnique({
      where: { storyId_userId: { storyId, userId } }
    });

    if (existing && existing.emoji === emoji) {
      await prisma.storyReaction.delete({ where: { id: existing.id } });
      return res.json({ success: true, reacted: false });
    }

    await prisma.storyReaction.upsert({
      where: { storyId_userId: { storyId, userId } },
      update: { emoji },
      create: { storyId, userId, emoji }
    });
    
    res.json({ success: true, reacted: true, emoji });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/stories/:id/reply", checkUserRestriction, async (req: any, res: any) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.user.id;
    const { message } = req.body;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return res.status(404).json({ error: "Story not found" });

    const reply = await prisma.storyReply.create({
      data: { storyId, userId, message }
    });

    // Create DM Message
    await prisma.message.create({
      data: {
        senderId: userId,
        receiverId: story.userId,
        content: `Replied to your story: "${message}"`,
        messageText: message
      }
    });

    res.json(reply);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/stories/:id/viewers", checkUserRestriction, async (req: any, res: any) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.user.id;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return res.status(404).json({ error: "Story not found" });
    if (story.userId !== userId) return res.status(403).json({ error: "Unauthorized access to telemetry" });

    const viewers = await prisma.storyView.findMany({
      where: { storyId },
      include: { 
        user: { select: { id: true, name: true, avatar: true, uniqueId: true } },
      }
    });

    const reactions = await prisma.storyReaction.findMany({
      where: { storyId }
    });

    const formattedViewers = viewers.map((v: any) => ({
      ...v.user,
      viewedAt: v.viewedAt,
      reaction: reactions.find((r: any) => r.userId === v.userId)?.emoji || null
    }));

    res.json(formattedViewers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts", uploadLimiter, upload.array("images", 10), checkUserRestriction, async (req: any, res: any) => {
  try {
    const { caption, location, parentId } = req.body;
    const userId = req.body.userId || req.user.id;
    const files = req.files as any[];

    console.log(`[POST UPLOAD] Received ${files?.length || 0} images for user ${userId}`);

    if ((!files || files.length === 0) && !parentId) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    let mainImageUrl = "";
    let mainImagePath = "";
    let mainPhash = null;
    let imageUrls: string[] = [];
    let imagePaths: string[] = [];

    if (parentId) {
      const parent = await prisma.post.findUnique({ where: { id: parseInt(parentId) } });
      if (!parent) return res.status(404).json({ error: "Parent post not found" });
      mainImageUrl = parent.imageUrl || "";
      mainImagePath = parent.imagePath;
      mainPhash = parent.phash;
      imageUrls = parent.imageUrls;
      imagePaths = parent.imagePaths;
    } else {
      // Parallel upload all images to Cloudinary
      const uploadPromises = files.map(file => uploadImage(file.buffer));
      const results = await Promise.all(uploadPromises);
      
      mainImageUrl = results[0].secure_url;
      mainImagePath = results[0].public_id;
      
      imageUrls = results.map(r => r.secure_url);
      imagePaths = results.map(r => r.public_id);

      console.log(`[SUCCESS] Post contains ${imageUrls.length} assets.`);
    }

    const post = await prisma.post.create({
      data: {
        userId: parseInt(userId),
        caption,
        location: location || null,
        imagePath: mainImagePath,
        imageUrl: mainImageUrl,
        imageUrls,
        imagePaths,
        phash: mainPhash,
        parentId: parentId ? parseInt(parentId) : null
      },
      include: { 
        user: { select: { name: true } }
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
    userSessionCache.delete(id);
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
    userSessionCache.delete(id);
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
    const userId = req.user.id;
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

app.post("/api/posts/:id/repost", checkUserRestriction, async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;
    
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
       return res.status(404).json({ error: "Post not found" });
    }

    const newPost = await prisma.post.create({
      data: {
         userId: userId,
         caption: post.caption,
         location: post.location,
         imagePath: post.imagePath,
         imageUrl: post.imageUrl,
         imageUrls: post.imageUrls || [],
         imagePaths: post.imagePaths || [],
         phash: post.phash,
         parentId: postId
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.json(newPost);
  } catch (error: any) {
    console.error("[REPOST ERROR]", error);
    res.status(500).json({ error: error.message });
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
    const userId = req.user.id;

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
    const followerId = req.user.id;
    if (followerId === followingId) return res.status(400).json({ error: "Cannot follow yourself" });
      const existing = await prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId, followingId } } });
      
      if (existing) {
        await prisma.userFollow.delete({ where: { id: existing.id } });
        res.json({ following: false, status: null });
      } else {
        const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
        const requestStatus = targetUser?.isPrivate ? "PENDING" : "ACCEPTED";
        
        const follow = await prisma.userFollow.create({ 
          data: { followerId, followingId, status: requestStatus } 
        });

        const sender = await prisma.user.findUnique({ where: { id: followerId } });
        
        await prisma.notification.create({
          data: {
            userId: followingId, senderId: followerId, senderName: sender?.name,
            senderAvatar: sender?.avatar, 
            type: requestStatus === "PENDING" ? "FOLLOW_REQUEST" : "FOLLOW", 
            requestId: requestStatus === "PENDING" ? follow.id : null,
            content: requestStatus === "PENDING" ? "requested to follow you" : "started following you"
          }
        });

        const targetSocketId = userSockets.get(followingId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("notification", { 
            type: requestStatus === "PENDING" ? "FOLLOW_REQUEST" : "FOLLOW", 
            senderName: sender?.name,
            content: requestStatus === "PENDING" ? "requested to follow you" : "started following you"
          });
        }

        res.json({ following: true, status: requestStatus });
      }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:id/profile", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const viewerId = getUserIdFromRequest(req);
    
    // Performance optimization: Check cache
    const cacheKey = `profile_${id}_${viewerId || "guest"}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) return res.json(cachedData);

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { posts: true, followers: true, following: true } }
      }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Check relationship
    let isFollowing = false;
    let followStatus = null;
    if (viewerId) {
       const follow = await prisma.userFollow.findUnique({
         where: { followerId_followingId: { followerId: viewerId, followingId: id } }
       });
       if (follow) {
         isFollowing = follow.status === "ACCEPTED";
         followStatus = follow.status;
       }
    }

    // Privacy Logic: If private and NOT following, dont show posts
    const canSeePosts = !user.isPrivate || isFollowing || viewerId === id;

    const posts = canSeePosts ? await prisma.post.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 12, // Only load initial batch for speed
      include: { 
        user: true, 
        _count: { select: { likes: true, comments: true, reposts: true } } 
      }
    }) : [];

    const responseData = { ...user, posts, isFollowing, followStatus, isPrivate: user.isPrivate };
    setCachedData(cacheKey, responseData);
    res.json(responseData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:id/posts", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 12;
    const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;
    const viewerId = getUserIdFromRequest(req);

    // Security/Privacy Check
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let isFollowing = false;
    if (viewerId) {
      const follow = await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: id } }
      });
      if (follow) isFollowing = follow.status === "ACCEPTED";
    }

    if (user.isPrivate && !isFollowing && viewerId !== id) {
       return res.json({ posts: [], nextCursor: null });
    }

    const posts = await prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        _count: { select: { likes: true, comments: true, reposts: true } }
      }
    });

    let nextCursor = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem.id;
    }

    res.json({ posts, nextCursor });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Follow Lists
app.get("/api/users/:id/followers", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const followers = await prisma.userFollow.findMany({
      where: { followingId: id, status: "ACCEPTED" },
      include: { follower: true }
    });
    res.json(followers.map((f: any) => f.follower));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users/:id/following", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const following = await prisma.userFollow.findMany({
      where: { followerId: id, status: "ACCEPTED" },
      include: { following: true }
    });
    res.json(following.map((f: any) => f.following));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Request Moderation

app.get("/api/messages/conversations/:userId", async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Performance optimization: 
    // 1. Limit message scan to latest 200 (covers most active conversations)
    // 2. Only select required fields to minimize memory/payload
    const rawConversations = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, senderId: true, receiverId: true, content: true, 
        messageText: true, createdAt: true, isRead: true,
        sender: { select: { id: true, name: true, avatar: true, uniqueId: true, lastSeen: true } },
        receiver: { select: { id: true, name: true, avatar: true, uniqueId: true, lastSeen: true } }
      }
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
      const isOnline = Date.now() - new Date(u.lastSeen).getTime() < 60000;
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
    const senderId = req.user.id;
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
    const senderId = req.user.id;
    const rid = parseInt(receiverId);

    // Privacy check
    const receiver = await prisma.user.findUnique({ where: { id: rid } });
    if (receiver?.isPrivate && senderId !== rid) {
       const follow = await prisma.userFollow.findUnique({
          where: { followerId_followingId: { followerId: senderId, followingId: rid } }
       });
       if (!follow || follow.status !== "ACCEPTED") {
          return res.status(403).json({ error: "Private transmission: Follow link required." });
       }
    }
    
    const message = await prisma.message.create({
      data: { 
        senderId, 
        receiverId: rid, 
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

app.post("/admin/scan", upload.array("images", 1), checkAdminMode, async (req: any, res: any) => {
  try {
    const files = req.files as any[];
    if (!files || files.length === 0) return res.status(400).json({ error: "No scan source detected" });
    const { phash } = await extractFeaturesFromBuffer(files[0].buffer);
    
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

    // Make sure we encompass the origin post just in case it didn't pass its own filter
    if (!matchIds.includes(targetPostId)) matchIds.push(targetPostId);
    
    // Manual cleanup for relations to bypass possible foreign key blocks for the entire family
    await prisma.like.deleteMany({ where: { postId: { in: matchIds } } });
    await prisma.comment.deleteMany({ where: { postId: { in: matchIds } } });
    await prisma.flaggedContent.deleteMany({ where: { postId: { in: matchIds } } });
    await prisma.post.deleteMany({ where: { parentId: { in: matchIds } } });
    await prisma.imageMatch.deleteMany({ where: { OR: [{ imageId: { in: matchIds } }, { matchedImageId: { in: matchIds } }] } });

    const deleteResult = await prisma.post.deleteMany({
      where: { id: { in: matchIds } }
    });

    // Important: Clear cache so the feed reflects the deletion immediately
    cache.clear();

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

app.get("/api/health-check", async (req: any, res: any) => {
  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: "OK", 
      version: "1.0.6",
      database: "CONNECTED",
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    console.error("[HEALTH CHECK FAILED]", error);
    res.status(500).json({ 
      status: "ERROR", 
      database: "DISCONNECTED",
      error: error.message,
      suggestion: "Check your DATABASE_URL and DIRECT_URL on Render."
    });
  }
});

app.get("/api/emergency-db-fix", async (req: any, res: any) => {
  try {
    // Force add all missing columns
    const commands = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetOtp" TEXT;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetOtpExpiry" TIMESTAMP;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetOtpAttempts" INTEGER DEFAULT 0;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetOtpLockedAt" TIMESTAMP;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banUntil" TIMESTAMP;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banCount" INTEGER DEFAULT 0;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason" TEXT;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isRestricted" BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`
    ];

    for (const sql of commands) {
      await prisma.$executeRawUnsafe(sql);
    }
    
    res.json({ message: "All missing columns have been forced into the database successfully." });
  } catch (error: any) {
    console.error("[FIX FAILED]", error);
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
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message
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