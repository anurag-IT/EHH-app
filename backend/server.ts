import "dotenv/config";
import "express-async-errors";

import express from "express";
import morgan from "morgan";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from 'google-auth-library';
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
import { detectAiImage } from "./src/services/aiDetectionService.js";

import { createServer } from "http";
import { Server } from "socket.io";

const prisma = new PrismaClient() as any;
const app = express();
const httpServer = createServer(app);

// --- CORS Whitelist ---
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");
const configuredOrigins = [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS]
  .flatMap((value) => value ? value.split(",") : [])
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3001",
  ...configuredOrigins
]));

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'], // Prefer WebSocket; fall back to polling
  pingTimeout: 20000,    // Detect dead connections faster (default 20s)
  pingInterval: 10000,   // Ping every 10s (default 25s)
  connectTimeout: 10000, // Reject slow handshakes within 10s
  maxHttpBufferSize: 1e6 // 1 MB max message size
});
const PORT = Number(process.env.PORT) || 3001;

// --- Security Middleware ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Frontend uses Vite CDN + Cloudinary — set full CSP in production via reverse proxy
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: (origin: any, callback: any) => {
    if (!origin || ALLOWED_ORIGINS.includes(normalizeOrigin(origin))) return callback(null, true);
    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize()); // strips $ and . from req.body to prevent injection
app.use(compression() as any);


// --- Logging ---
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));


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
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hour window
  max: 10,
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
const CACHE_TTL = 60000; // 60 seconds (was 30s — doubled for better hit rate)

// Performance optimization: Throttle lastSeen updates and cache user sessions
const lastSeenThrottle = new Map<number, number>();
const userSessionCache = new Map<number, { user: any, cachedAt: number }>();
const SESSION_CACHE_TTL = 60000; // 60s session cache (was 30s)

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key); // Remove stale entry
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Periodically evict expired cache entries and clean up expired stories
setInterval(async () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL * 2) cache.delete(key);
  }
  for (const [id, entry] of userSessionCache.entries()) {
    if (now - entry.cachedAt > SESSION_CACHE_TTL * 2) userSessionCache.delete(id);
  }

  // Delete expired stories (runs every 5 minutes)
  try {
    const deleted = await prisma.story.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (deleted.count > 0) console.log(`[CLEANUP] Deleted ${deleted.count} expired stories`);
  } catch (e) {
    // Non-critical — don't crash the server
  }
}, 5 * 60_000); // Every 5 minutes

const ALLOWED_IMAGE_MIMETYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'image/heic',
  'image/heif'
];

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only images are allowed.`));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max per file
});

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  avatar: true,
  uniqueId: true,
  bio: true,
  role: true,
  status: true,
  points: true,
  level: true,
  streak: true,
  district: true
};

const ADMIN_USER_SELECT: any = {
  ...PUBLIC_USER_SELECT,
  email: true,
  banReason: true,
  banUntil: true,
  banCount: true,
  isRestricted: true,
  lastSeen: true
};

const formatPublicUser = (user: any) => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    uniqueId: user.uniqueId,
    avatar: user.avatar,
    bio: user.bio,
    isPrivate: !!user.isPrivate,
    role: user.role,
    status: user.status,
    _count: user._count,
    isFollowing: user.isFollowing,
    followStatus: user.followStatus ?? null
  };
};

const formatAdminUser = (user: any) => {
  if (!user) return null;

  return {
    ...formatPublicUser(user),
    email: user.email,
    banReason: user.banReason,
    banUntil: user.banUntil,
    banCount: user.banCount,
    isRestricted: !!user.isRestricted,
    lastSeen: user.lastSeen
  };
};

const buildVisiblePostWhere = (viewerId: number | null) => {
  if (!viewerId) {
    return { user: { isPrivate: false } };
  }

  return {
    OR: [
      { userId: viewerId },
      { user: { isPrivate: false } },
      { user: { followers: { some: { followerId: viewerId, status: "ACCEPTED" } } } }
    ]
  };
};

const buildPostSelect = (viewerId: number | null) => {
  const select: any = {
    id: true,
    userId: true,
    imagePath: true,
    imageUrl: true,
    imagePaths: true,
    imageUrls: true,
    caption: true,
    location: true,
    phash: true,
    parentId: true,
    createdAt: true,
    isAiGenerated: true,
    aiConfidence: true,
    user: { select: PUBLIC_USER_SELECT },
    _count: { select: { likes: true, comments: true, reposts: true } }
  };

  if (viewerId) {
    select.likes = { where: { userId: viewerId }, select: { id: true } };
    select.favourites = { where: { userId: viewerId }, select: { id: true } };
  }

  return select;
};

const formatPost = (post: any, followStatusByUserId?: Map<number, string>) => {
  const followStatus = followStatusByUserId?.get(post.userId) || null;

  return {
    ...post,
    user: formatPublicUser(post.user),
    isLiked: post.likes?.length > 0,
    isFavourited: post.favourites?.length > 0,
    isFollowing: followStatusByUserId?.get(post.userId) === "ACCEPTED",
    likesCount: post._count?.likes ?? 0,
    commentsCount: post._count?.comments ?? 0,
    repostsCount: post._count?.reposts ?? 0,
    imageUrls: post.imageUrls || [],
    imagePaths: post.imagePaths || [],
  };
};

// Gamification Utilities
const updateStreak = async (userId: number) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const now = new Date();
    const lastActive = new Date(user.lastActive);
    
    // Reset hours for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
    
    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Continued streak
      await prisma.user.update({
        where: { id: userId },
        data: { streak: { increment: 1 }, lastActive: now }
      });
    } else if (diffDays > 1) {
      // Streak broken
      await prisma.user.update({
        where: { id: userId },
        data: { streak: 1, lastActive: now }
      });
    } else if (diffDays === 0) {
       // Still today, just update lastActive
       await prisma.user.update({
         where: { id: userId },
         data: { lastActive: now }
       });
    }
  } catch (err) {
    console.error("Streak update error", err);
  }
};

const awardPoints = async (userId: number, points: number) => {
  try {
    // Also update streak whenever points are awarded (activity)
    await updateStreak(userId);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: points }, lastActive: new Date() },
      include: { badges: true }
    });

    let newLevel = "Beginner";
    if (user.points > 2000) newLevel = "Leader";
    else if (user.points > 500) newLevel = "Eco Warrior";
    else if (user.points > 100) newLevel = "Active";

    if (newLevel !== user.level) {
      await prisma.user.update({
        where: { id: userId },
        data: { level: newLevel }
      });
      
      prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          content: `Level Up! You are now an ${newLevel}.`
        }
      }).catch(() => {});
    }

    // Badge Check: First Signal
    const hasFirstBadge = user.badges.some((b: any) => b.name === "First Signal");
    if (!hasFirstBadge) {
      const postsCount = await prisma.post.count({ where: { userId } });
      if (postsCount >= 1) {
        await prisma.badge.create({
          data: { userId, name: "First Signal", icon: "🚀" }
        });
      }
    }

    // Badge Check: Century Club (100 points)
    const hasCenturyBadge = user.badges.some((b: any) => b.name === "Century Club");
    if (!hasCenturyBadge && user.points >= 100) {
      await prisma.badge.create({
        data: { userId, name: "Century Club", icon: "💯" }
      });
    }
  } catch (error) {
    console.error("[GAMIFICATION ERROR]", error);
  }
};

const isSelfOrAdmin = (requestUser: any, targetUserId: number) => {
  return requestUser?.role === "ADMIN" || requestUser?.id === targetUserId;
};

const ensureCanMessageUser = async (senderId: number, receiver: any) => {
  if (!receiver) return "Receiver not found";
  if (!receiver.isPrivate || senderId === receiver.id) return null;

  const follow = await prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId: senderId, followingId: receiver.id } }
  });

  if (!follow || follow.status !== "ACCEPTED") {
    return "Private transmission: Follow link required.";
  }

  return null;
};

// --- Utilities ---
const safeParseInt = (val: any, fallback: number = 0): number => {
  const parsed = parseInt(val);
  return isNaN(parsed) ? fallback : parsed;
};

const sendResponse = (res: express.Response, status: number, data: any, message?: string) => {
  return res.status(status).json({
    success: status >= 200 && status < 300,
    data: data || null,
    error: message || null
  });
};

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


async function generateUniqueId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let result = "EH-";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await prisma.user.findUnique({
      where: { uniqueId: result },
      select: { id: true }
    });

    if (!existing) {
      return result;
    }
  }

  throw new Error("Could not generate a unique profile identifier");
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
    
    // 1. User Session Cache (60s TTL) to avoid DB hit on every request
    let cached = userSessionCache.get(id);
    let user = cached && (Date.now() - cached.cachedAt < SESSION_CACHE_TTL) ? cached.user : null;

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
      if (user.status === "PERMANENT_BAN") {
        return res.status(403).json({
          error: "PERMANENT_BAN",
          message: "Your account has been permanently suspended.",
          reason: user.banReason
        });
      }
      return res.status(403).json({
        error: "TEMP_BAN",
        message: "Your account is temporarily suspended.",
        reason: user.banReason,
        banUntil: user.banUntil,
        strike: user.banStrike
      });
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

const checkAdminMode = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Please login" });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number, role: string, name?: string };

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, role: true, status: true, isRestricted: true, banUntil: true }
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access is needed." });
    }

    if (adminUser.status === "BANNED" || adminUser.status === "PERMANENT_BAN" || adminUser.isRestricted) {
      return res.status(403).json({ error: "Admin account is restricted." });
    }

    (req as any).adminUser = adminUser;
    next();
  } catch (error: any) {
    res.status(401).json({ error: "Invalid admin session" });
  }
};

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

    const uniqueId = await generateUniqueId();
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

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment");
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, user: formatPublicUser(user) });
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
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    if (!user.password) {
      return res.status(400).json({ 
        error: "This account uses Google Sign-In. Please use the Google button to login." 
      });
    }

    // Block permanently banned users at login
    if (user.status === "PERMANENT_BAN") {
      return res.status(403).json({
        error: "PERMANENT_BAN",
        message: "Your account has been permanently suspended from EHH.",
        reason: user.banReason || "Violation of community guidelines",
        banCount: user.banStrike || user.banCount
      });
    }



    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "WRONG_PASSWORD" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment");
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // --- Streak Logic ---
    const now = new Date();
    const lastActive = new Date(user.lastActive || user.createdAt);
    let newStreak = user.streak || 0;

    const diffInMs = now.getTime() - lastActive.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 1) {
      newStreak += 1;
    } else if (diffInDays > 1) {
      newStreak = 1;
    } else if (newStreak === 0) {
      newStreak = 1;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        streak: newStreak,
        lastActive: now
      }
    });

    res.json({
      token,
      user: formatPublicUser(updatedUser)
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

    if (!user.password) {
      return res.status(400).json({ 
        error: "This account uses Google Sign-In. No password reset needed — just use the Google button." 
      });
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

    // Send the email. In development, we keep a local debug log if delivery is unavailable.
    try {
      if (resend) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'EHH Security <onboarding@resend.dev>',
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
    }
    
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n\n[OTP DEBUG] Code for ${user.email} is: ${otp}\n\n`);
    }

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
        resetOtpExpiry: null,
        resetOtpAttempts: 0,
        resetOtpLockedAt: null
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
      select: PUBLIC_USER_SELECT,
      take: 10
    });
    res.json(users.map((user: any) => formatPublicUser(user)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/users/profile", checkUserRestriction, upload.array("images", 1), async (req: any, res: any) => {
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
        district: req.body.district !== undefined ? req.body.district : req.user.district,
        isPrivate: isPrivate === "true" || isPrivate === true,
        avatar: avatarUrl
      },
      select: PUBLIC_USER_SELECT
    });
    userSessionCache.delete(userId);
    // Clear profile caches for all viewers
    for (const key of cache.keys()) {
      if (key.startsWith(`profile_${userId}_`)) {
        cache.delete(key);
      }
    }
    res.json(formatPublicUser(updatedUser));
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

app.post("/api/auth/google", authLimiter, async (req: any, res: any) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Google credential required" });

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("[CRITICAL] GOOGLE_CLIENT_ID is missing on server environment!");
      return res.status(500).json({ error: "Server misconfiguration: GOOGLE_CLIENT_ID missing" });
    }

    // Verify the token with Google
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyError: any) {
      console.error("[GOOGLE VERIFY ERROR]", verifyError.message);
      return res.status(401).json({ error: "Google token verification failed" });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: "Invalid Google token payload" });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists by googleId first, then by email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] }
    });

    if (user) {
      // Existing user — link googleId if not already linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatar: user.avatar || picture }
        });
      }
      // Block permanently banned users
      if (user.status === "PERMANENT_BAN") {
        return res.status(403).json({
          error: "PERMANENT_BAN",
          message: "Your account has been permanently suspended from EHH.",
          reason: user.banReason || "Violation of community guidelines",
          banCount: user.banStrike || user.banCount
        });
      }


    } else {
      // New user — auto-register with Google info
      const uniqueId = await generateUniqueId(); 
      user = await prisma.user.create({
        data: {
          name: name || "EHH User",
          email: email.toLowerCase(),
          googleId,
          avatar: picture || null,
          uniqueId,
          password: null,
        }
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    );

    // --- Streak Logic ---
    const now = new Date();
    const lastActiveTime = new Date(user.lastActive || user.createdAt);
    let newStreak = user.streak || 0;

    const diffInMs = now.getTime() - lastActiveTime.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 1) {
      newStreak += 1;
    } else if (diffInDays > 1) {
      newStreak = 1;
    } else if (newStreak === 0) {
      newStreak = 1;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { streak: newStreak, lastActive: now }
    });

    res.json({ token, user: formatPublicUser(updatedUser) });

  } catch (error: any) {
    console.error("[GOOGLE AUTH 500]", error);
    res.status(500).json({ error: error.message || "Internal server error during Google Auth" });
  }
});

app.get("/api/users/:id", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(formatPublicUser(user));
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
      isAiGenerated: true, aiConfidence: true,
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
      where: buildVisiblePostWhere(currentUserId),
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

    const followStatusByUserId = new Map<number, string>(
      followedAuthors.map((follow: any) => [follow.followingId, follow.status])
    );

    const formattedPosts = posts.map((post: any) => formatPost(post, followStatusByUserId));

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
    await prisma.post.deleteMany({ where: { id } });
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
    if (!text) return res.status(400).json({ success: false, error: "Comment text is required" });

    const targetPost = await prisma.post.findFirst({
      where: { AND: [{ id: postId }, buildVisiblePostWhere(userId)] },
      select: { id: true, userId: true }
    });

    if (!targetPost) return res.status(404).json({ success: false, error: "Post not found" });

    const comment = await prisma.comment.create({
      data: { text, postId, userId },
      include: {
        user: { select: PUBLIC_USER_SELECT },
        post: { select: { userId: true } }
      }
    });

    // Create notification
    if (comment.post.userId !== userId) {
      prisma.notification.create({
        data: {
          userId: comment.post.userId, senderId: userId, senderName: comment.user.name,
          senderAvatar: comment.user.avatar, type: "COMMENT", postId: postId, content: "commented on your post"
        }
      }).catch(() => {});
      
      const targetSocketId = userSockets.get(comment.post.userId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("notification", { 
          type: "COMMENT", senderName: comment.user.name, content: "commented on your post" 
        });
      }
    }

    await awardPoints(userId, 3); // +3 for commenting

    const { post, ...commentResponse } = comment;
    res.json({
      success: true,
      data: {
        ...commentResponse,
        user: formatPublicUser(commentResponse.user)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/stories", uploadLimiter, checkUserRestriction, upload.array("images", 1), async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { caption, textColor, bgColor, stickers } = req.body;
    const files = req.files as any[];

    let imageUrl = "";
    let imagePath = "";

    if (files && files.length > 0) {
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
        userId,
        imageUrl: imageUrl,
        imagePath: imagePath,
        caption,
        textColor,
        bgColor,
        stickers: stickers ? JSON.parse(stickers) : null,
        expiresAt
      },
      include: { user: { select: PUBLIC_USER_SELECT } }
    });

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
        where: { followerId: currentUserId, status: "ACCEPTED" },
        select: { followingId: true }
      });
      const followingIds = following.map((f: any) => f.followingId);

      stories = await prisma.story.findMany({
        where: {
          expiresAt: { gt: now },
          OR: [
            { userId: currentUserId },
            { userId: { in: followingIds } },
            { user: { isPrivate: false } }
          ]
        },
        include: includeQuery,
        orderBy: { createdAt: "desc" }
      });
    } else {
      stories = await prisma.story.findMany({
        where: { expiresAt: { gt: now }, user: { isPrivate: false } },
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
          user: formatPublicUser(story.user),
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

app.post("/api/posts", uploadLimiter, checkUserRestriction, upload.array("images", 20), async (req: any, res: any) => {
  try {
    const { caption, location, parentId } = req.body;
    const userId = req.user.id;
    const files = req.files as any[];

    if ((!files || files.length === 0) && !parentId) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    let mainImageUrl = "";
    let mainImagePath = "";
    let mainPhash = null;
    let imageUrls: string[] = [];
    let imagePaths: string[] = [];

    // Copy buffer before async work — multer may release it after response
    let primaryBuffer: Buffer | null = null;
    let primaryOriginalname = "";

    if (parentId) {
      const parent = await prisma.post.findUnique({ where: { id: parseInt(parentId) } });
      if (!parent) return res.status(404).json({ error: "Parent post not found" });
      mainImageUrl = parent.imageUrl || "";
      mainImagePath = parent.imagePath || "";
      mainPhash = parent.phash;
      imageUrls = parent.imageUrls || [];
      imagePaths = parent.imagePaths || [];
    } else {
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "At least one image signal is required for new transmission" });
      }

      primaryBuffer = Buffer.from(files[0].buffer);
      primaryOriginalname = files[0].originalname;

      const uploadPromises = files.map(file => uploadImage(file.buffer));
      const results = await Promise.all(uploadPromises);
      mainImageUrl = results[0].secure_url;
      mainImagePath = results[0].public_id;
      imageUrls = results.map(r => r.secure_url);
      imagePaths = results.map(r => r.public_id);

      try {
        const features = await extractFeaturesFromBuffer(files[0].buffer);
        mainPhash = features.phash;
      } catch (err) {
        console.error("[PHASH ERROR] Feature extraction failed:", err);
      }
    }

    // Save post immediately — AI detection runs in background so user doesn't wait
    const post = await prisma.post.create({
      data: {
        userId,
        caption: caption || "",
        location: location || "",
        parentId: parentId ? parseInt(parentId) : null,
        imageUrl: mainImageUrl,
        imagePath: mainImagePath,
        phash: mainPhash,
        imageUrls,
        imagePaths,
        isAiGenerated: false,
        aiConfidence: 0,
      },
      include: {
        user: { select: PUBLIC_USER_SELECT },
        _count: { select: { likes: true, comments: true, reposts: true } }
      }
    });

    cache.clear();
    res.json({ success: true, post: formatPost(post) });

    // --- Background: AI detection + point awarding (never blocks the upload response) ---
    if (!parentId && primaryBuffer) {
      const captionSnap = caption;
      const bufSnap = primaryBuffer;
      const nameSnap = primaryOriginalname;
      setImmediate(async () => {
        try {
          const aiResult = await detectAiImage(bufSnap, captionSnap, nameSnap);
          if (aiResult.isAiGenerated) {
            await prisma.post.update({
              where: { id: post.id },
              data: { isAiGenerated: true, aiConfidence: aiResult.confidence }
            });
            cache.clear();
            // Push real-time update to the poster's feed
            const sid = userSockets.get(userId);
            if (sid) io.to(sid).emit("postUpdated", { postId: post.id, isAiGenerated: true });
          } else {
            await awardPoints(userId, 10);
          }
        } catch {
          // Detection failed — award points (give user benefit of doubt)
          try { await awardPoints(userId, 10); } catch {}
        }
      });
    } else if (parentId) {
      // Reposts: award points immediately (no image to scan)
      awardPoints(userId, 10).catch(() => {});
    }

    if (!parentId && mainImageUrl) {
      processImageAsync(post.id, mainImageUrl).catch((err: any) => {
        console.error(`Failed async processing for post ${post.id}`, err);
      });
    }
  } catch (error: any) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/:id(\\d+)", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const viewerId = getUserIdFromRequest(req);
    const post = await prisma.post.findFirst({
      where: {
        AND: [
          { id },
          buildVisiblePostWhere(viewerId)
        ]
      },
      select: buildPostSelect(viewerId)
    });

    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(formatPost(post));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/:id(\\d+)/comments", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const viewerId = getUserIdFromRequest(req);
    const post = await prisma.post.findFirst({
      where: {
        AND: [
          { id },
          buildVisiblePostWhere(viewerId)
        ]
      },
      select: { id: true }
    });

    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = await prisma.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: PUBLIC_USER_SELECT }
      }
    });

    res.json(comments.map((comment: any) => ({
      ...comment,
      user: formatPublicUser(comment.user)
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/:id(\\d+)/chain", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const viewerId = getUserIdFromRequest(req);
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    const related = await prisma.post.findMany({
      where: {
        AND: [
          { OR: [{ phash: post.phash }, { parentId: post.id }, { id: post.parentId || -1 }] },
          buildVisiblePostWhere(viewerId)
        ]
      },
      select: buildPostSelect(viewerId)
    });
    res.json(related.map((relatedPost: any) => formatPost(relatedPost)));
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
    const aiGeneratedPosts = await prisma.post.count({ where: { isAiGenerated: true } });
    res.json({ totalUsers, activeUsers, bannedUsers, totalPosts, flaggedCount, aiGeneratedPosts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/users", checkAdminMode, async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'desc' },
      select: {
        ...ADMIN_USER_SELECT,
        _count: { select: { posts: true } }
      }
    });
    res.json(users.map((user: any) => formatAdminUser(user)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/users/:id/ban", checkAdminMode, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const { durationDays, reason } = req.body;

    // Get current user to check strike count
    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    // Cannot ban an administrator
    if (currentUser.role === "ADMIN") {
      return res.status(403).json({ error: "Cannot restrict an administrator." });
    }

    // Cannot ban already permanently banned user
    if (currentUser.status === "PERMANENT_BAN") {
      return res.status(400).json({ error: "User is already permanently banned." });
    }

    const newStrike = (currentUser.banStrike || 0) + 1;

    // Strike escalation rules:
    // Strike 1 → 1 day ban (regardless of what admin chose, enforce the ladder)
    // Strike 2 → 3 days ban
    // Strike 3 → 7 days ban
    // Strike 4+ → PERMANENT BAN (auto, no override)
    let finalDuration: number;
    let finalStatus: string;
    let banUntil: Date | null = null;

    if (durationDays === -1) {
      // Admin explicitly chose permanent — allow this anytime
      finalStatus = "PERMANENT_BAN";
      finalDuration = -1;
    } else if (newStrike >= 4) {
      // 4th strike always = permanent
      finalStatus = "PERMANENT_BAN";
      finalDuration = -1;
    } else {
      // Enforce escalation ladder
      const strikeDurations: Record<number, number> = { 1: 1, 2: 3, 3: 7 };
      finalDuration = strikeDurations[newStrike] || durationDays;
      banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + finalDuration);
      finalStatus = "BANNED";
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: finalStatus,
        banUntil,
        banReason: reason,
        isRestricted: true,
        banCount: { increment: 1 },
        banStrike: newStrike
      }
    });

    userSessionCache.delete(id);

    const banDescription = finalStatus === "PERMANENT_BAN"
      ? `PERMANENT BAN (Strike ${newStrike}). Reason: ${reason}`
      : `${finalDuration}-day ban (Strike ${newStrike}/${finalStatus === "BANNED" ? "3" : ""}). Reason: ${reason}`;

    await prisma.adminLog.create({
      data: {
        actionType: "ban_user",
        adminName: req.adminUser.name,
        targetId: user.uniqueId,
        details: banDescription
      }
    });

    res.json({
      success: true,
      user,
      appliedDuration: finalDuration,
      strike: newStrike,
      isPermanent: finalStatus === "PERMANENT_BAN",
      message: finalStatus === "PERMANENT_BAN"
        ? `User permanently banned (Strike ${newStrike})`
        : `User banned for ${finalDuration} days (Strike ${newStrike} of 3)`
    });
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
    res.json({ success: true, user: formatAdminUser(user) });
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
        }).catch(() => {});

        const targetSocketId = userSockets.get(like.post.userId);
        if (targetSocketId) {
          io.to(targetSocketId).emit("notification", { type: "LIKE", senderName: like.user.name, content: "liked your post" });
        }

        // Only award like points if the post is NOT AI generated
        const likedPost = await prisma.post.findUnique({ 
          where: { id: postId }, 
          select: { isAiGenerated: true } 
        });
        if (!likedPost?.isAiGenerated) {
          await awardPoints(like.post.userId, 2); // +2 for receiver of like
        }
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
    res.status(500).json({ success: false, error: "Interaction synchronization failure." });
  }
});

app.post("/api/posts/:id/favourite", checkUserRestriction, async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;
    let favourited = true;

    try {
      await prisma.favourite.create({
        data: { userId, postId }
      });
    } catch (createError: any) {
      if (createError.code === 'P2002') {
        await prisma.favourite.delete({ where: { userId_postId: { userId, postId } } });
        favourited = false;
      } else {
        throw createError;
      }
    }

    res.json({ success: true, favourited });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Cloud storage synchronization failure." });
  }
});

app.get("/api/users/:id/favourites", checkUserRestriction, async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.id);
    const viewerId = req.user.id;

    // Only allow users to see their own favourites if they are private? 
    // For now, let's keep it open or private to the owner.
    if (userId !== viewerId) {
      return res.status(403).json({ error: "Access Denied" });
    }

    const favourites = await prisma.favourite.findMany({
      where: { userId },
      include: {
        post: {
          select: buildPostSelect(viewerId)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const posts = favourites.map((f: any) => formatPost(f.post));
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/posts/:id/repost", checkUserRestriction, async (req: any, res: any) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;
    
    const post = await prisma.post.findFirst({
      where: { AND: [{ id: postId }, buildVisiblePostWhere(userId)] },
      include: { user: { select: { name: true, avatar: true } } }
    });
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });

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
        user: { select: PUBLIC_USER_SELECT },
        _count: { select: { likes: true, comments: true, reposts: true } }
      }
    });

    // Create Notification for the original author
    if (post.userId !== userId) {
      const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true } });
      prisma.notification.create({
        data: {
          userId: post.userId, senderId: userId, senderName: sender?.name,
          senderAvatar: sender?.avatar, type: "REPOST", postId: newPost.id, content: "reposted your signal"
        }
      }).catch(() => {});

      const targetSocketId = userSockets.get(post.userId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("notification", { 
          type: "REPOST", senderName: sender?.name, content: "reposted your signal" 
        });
      }
    }

    res.json({ success: true, data: formatPost(newPost) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/notifications/:userId", checkUserRestriction, async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!isSelfOrAdmin(req.user, userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const notifications = await prisma.notification.findMany({
      where: { userId }, orderBy: { createdAt: "desc" }, take: 50
    });
    res.json(notifications.map((notification: any) => ({
      ...notification,
      sender: notification.senderId ? {
        id: notification.senderId,
        name: notification.senderName,
        avatar: notification.senderAvatar
      } : null
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/:id/read", checkUserRestriction, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true }
    });

    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (!isSelfOrAdmin(req.user, notification.userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/notifications/:userId/unread-count", checkUserRestriction, async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!isSelfOrAdmin(req.user, userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
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
    const existing = await prisma.userFollow.findUnique({ 
      where: { followerId_followingId: { followerId, followingId } } 
    });

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
      select: {
        ...PUBLIC_USER_SELECT,
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
      select: buildPostSelect(viewerId)
    }) : [];

    const followStatusByUserId = new Map<string | number, string>();
    if (followStatus) {
      followStatusByUserId.set(id, followStatus);
    }

    const responseData = {
      ...formatPublicUser(user),
      posts: posts.map((post: any) => formatPost(post, followStatusByUserId as Map<number, string>)),
      isFollowing,
      followStatus,
      isPrivate: user.isPrivate
    };
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
    const user = await prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT
    });
    if (!user) return res.status(404).json({ error: "User not found" });

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

    if (user.isPrivate && !isFollowing && viewerId !== id) {
       return res.json({ posts: [], nextCursor: null });
    }

    const posts = await prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: buildPostSelect(viewerId)
    });

    let nextCursor = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem.id;
    }

    const followStatusByUserId = new Map<number, string>();
    if (followStatus) {
      followStatusByUserId.set(id, followStatus);
    }

    res.json({
      posts: posts.map((post: any) => formatPost(post, followStatusByUserId)),
      nextCursor
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Follow Lists
app.get("/api/users/:id/followers", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const viewerId = getUserIdFromRequest(req);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isPrivate: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.isPrivate && viewerId !== id) {
      const follow = viewerId ? await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: id } }
      }) : null;

      if (!follow || follow.status !== "ACCEPTED") {
        return res.json([]);
      }
    }

    const followers = await prisma.userFollow.findMany({
      where: { followingId: id, status: "ACCEPTED" },
      include: { follower: { select: PUBLIC_USER_SELECT } }
    });
    res.json(followers.map((f: any) => formatPublicUser(f.follower)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users/:id/following", async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const viewerId = getUserIdFromRequest(req);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isPrivate: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.isPrivate && viewerId !== id) {
      const follow = viewerId ? await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: id } }
      }) : null;

      if (!follow || follow.status !== "ACCEPTED") {
        return res.json([]);
      }
    }

    const following = await prisma.userFollow.findMany({
      where: { followerId: id, status: "ACCEPTED" },
      include: { following: { select: PUBLIC_USER_SELECT } }
    });
    res.json(following.map((f: any) => formatPublicUser(f.following)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Request Moderation

app.get("/api/messages/conversations/:userId", checkUserRestriction, async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!isSelfOrAdmin(req.user, userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Scan the latest 100 messages to find unique conversation partners.
    // 100 is enough for users with up to ~50 active conversations.
    const rawConversations = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, senderId: true, receiverId: true, content: true,
        createdAt: true, isRead: true,
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
          lastMessage: m.content,
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

app.get("/api/messages/chat/:u1/:u2", checkUserRestriction, async (req: any, res: any) => {
  try {
    const u1 = parseInt(req.params.u1);
    const u2 = parseInt(req.params.u2);
    if (!req.user) {
      return res.status(401).json({ error: "Please login to continue" });
    }
    const limit = parseInt(req.query.limit) || 50;
    const cursor = req.query.cursor ? { id: parseInt(req.query.cursor) } : undefined;

    if (!isSelfOrAdmin(req.user, u1)) {
      return res.status(403).json({ error: "Access denied" });
    }

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
    const normalizedMessage = typeof messageText === "string" ? messageText.trim() : "";
    if (!uniqueId || !normalizedMessage) {
      return res.status(400).json({ error: "Receiver and message are required" });
    }
    const receiver = await prisma.user.findUnique({ where: { uniqueId } });
    const privacyError = await ensureCanMessageUser(senderId, receiver);
    if (privacyError) return res.status(receiver ? 403 : 404).json({ error: privacyError });
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: receiver.id,
        content: normalizedMessage,
        messageText: normalizedMessage,
        isAnonymous: true
      }
    });
    await prisma.notification.create({
      data: {
        userId: receiver.id,
        senderId,
        senderName: req.user.name,
        senderAvatar: req.user.avatar,
        type: "MESSAGE",
        content: "sent you an anonymous transmission signal."
      }
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
    const normalizedContent = typeof content === "string" ? content.trim() : "";
    if (!rid || !normalizedContent) {
      return res.status(400).json({ error: "Receiver and message are required" });
    }

    const receiver = await prisma.user.findUnique({ where: { id: rid } });
    const privacyError = await ensureCanMessageUser(senderId, receiver);
    if (privacyError) return res.status(receiver ? 403 : 404).json({ error: privacyError });
    
    const message = await prisma.message.create({
      data: { 
        senderId, 
        receiverId: rid, 
        content: normalizedContent, 
        messageText: normalizedContent
      }
    });

    // Quick notification trigger
    prisma.notification.create({
      data: { 
        userId: parseInt(receiverId), 
        senderId, 
        senderName: req.user.name,
        senderAvatar: req.user.avatar,
        type: "MESSAGE", 
        content: "sent you a message." 
      }
    }).catch((e: any) => console.error("Message Notify Error", e));

    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/scan", checkAdminMode, upload.array("images", 1), async (req: any, res: any) => {
  try {
    const files = req.files as any[];
    if (!files || files.length === 0) return res.status(400).json({ error: "No scan source detected" });
    const { phash } = await extractFeaturesFromBuffer(files[0].buffer);
    const matches = await getSimilarityResults({ phash });
    
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


app.get("/api/leaderboard", async (req: any, res: any) => {
  try {
    const { district } = req.query;
    const where: any = {};
    if (district) where.district = district;

    const leaders = await prisma.user.findMany({
      where,
      orderBy: { points: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        avatar: true,
        points: true,
        level: true,
        streak: true,
        district: true
      }
    });
    res.json({ leaders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/search", async (req: any, res: any) => {
  try {
    const query = req.query.q as string;
    const viewerId = getUserIdFromRequest(req);
    if (!query) return res.json([]);
    const posts = await prisma.post.findMany({
      where: {
        AND: [
          {
            OR: [
              { caption: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } }
            ]
          },
          buildVisiblePostWhere(viewerId)
        ]
      },
      select: buildPostSelect(viewerId),
      take: 20
    });
    res.json(posts.map((post: any) => formatPost(post)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/admin/posts", checkAdminMode, async (req: any, res: any) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: PUBLIC_USER_SELECT }, _count: { select: { likes: true, comments: true } } }
    });
    res.json(posts.map((post: any) => formatPost(post)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/admin/posts/:id", checkAdminMode, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.post.delete({ where: { id } });
    
    await prisma.adminLog.create({
      data: { actionType: "delete_post", adminName: req.adminUser.name, targetId: `Post-${id}`, details: "Directly deleted a single post via Admin panel." }
    });
    
    cache.clear();
    res.json({ success: true });
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
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "OK", version: "1.0.8" });
  } catch (error: any) {
    console.error("[HEALTH CHECK FAILED]", error);
    res.status(500).json({ status: "ERROR" });
  }
});

app.get("/api/emergency-db-fix", async (req: any, res: any) => {
  res.status(404).json({ error: "Not found" });
});

app.get("/api/make-me-admin", async (req: any, res: any) => {
  res.status(404).json({ error: "Not found" });
});

app.get("/db-test", async (req: any, res: any) => {
  res.status(404).json({ error: "Not found" });
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

// --- Centralized Error Handler ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || 500;
  let message = err.message || "Internal Server Error";
  let code = err.code || "SERVER_ERROR";

  // Prisma Error Handling
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, error: "Unique constraint violation. This record already exists.", code: "CONFLICT" });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: "Record not found.", code: "NOT_FOUND" });
    }
    message = "Database operation failed";
  }

  // JWT Error Handling
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: "Invalid token session", code: "UNAUTHORIZED" });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: "Token expired. Please login again.", code: "TOKEN_EXPIRED" });
  }

  // Multer Error Handling
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}`, code: "UPLOAD_ERROR" });
  }

  console.error(`[ERROR] ${req.method} ${req.path} - ${message}`);
  if (process.env.NODE_ENV !== "production" && err.stack) {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    error: message,
    code: code,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
});

// --- Global Safety Nets ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
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
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || !process.env.JWT_SECRET) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, avatar: true, status: true, isRestricted: true }
      });

      if (!user || user.status === "BANNED" || user.status === "PERMANENT_BAN" || user.isRestricted) {
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = user.id;
      socket.data.userName = user.name;
      socket.data.userAvatar = user.avatar;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as number;

    userSockets.set(userId, socket.id);
    prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() }
    }).catch(() => {});
    io.emit("userStatusUpdate", { userId, status: "online" });

    socket.on("sendMessage", async (data: { receiverId: number; content: string }) => {
      const senderId = socket.data.userId as number;
      const normalizedContent = typeof data.content === "string" ? data.content.trim() : "";
      if (!senderId || !data.receiverId || !normalizedContent) return;

      try {
        const receiver = await prisma.user.findUnique({ where: { id: data.receiverId } });
        const privacyError = await ensureCanMessageUser(senderId, receiver);
        if (privacyError) {
          socket.emit("socketError", { error: privacyError });
          return;
        }

        const message = await prisma.message.create({
          data: {
            senderId,
            receiverId: data.receiverId,
            content: normalizedContent,
            messageText: normalizedContent
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
            senderName: socket.data.userName as string,
            senderAvatar: socket.data.userAvatar as string | null,
            type: "MESSAGE",
            content: "sent you a message."
          }
        }).catch(() => {});

      } catch (err) {
        console.error("Socket SendMessage Error:", err);
      }
    });

    socket.on("typing", (data: { receiverId: number; isTyping: boolean }) => {
      const senderId = socket.data.userId as number;
      if (!senderId) return;

      const receiverSocketId = userSockets.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", { userId: senderId, isTyping: data.isTyping });
      }
    });

    socket.on("markAsRead", async (data: { senderId: number }) => {
      const receiverId = socket.data.userId as number;
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
      const disconnectedUserId = socket.data.userId as number | undefined;
      if (disconnectedUserId && userSockets.get(disconnectedUserId) === socket.id) {
        userSockets.delete(disconnectedUserId);
        io.emit("userStatusUpdate", { userId: disconnectedUserId, status: "offline" });
        
        prisma.user.update({
          where: { id: disconnectedUserId },
          data: { lastSeen: new Date() }
        }).catch(() => {});
      }
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
