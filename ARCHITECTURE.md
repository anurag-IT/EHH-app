# 🏗️ EHH System Architecture

## 🌍 Overview
EHH is a scalable social media platform focused on **image tracking, repost detection, and moderation**.

The system follows a **modular, scalable architecture** designed for future growth to millions of users.

---

## 🧱 High-Level Architecture
Mobile App / Web App
↓
API Gateway (Node.js)
↓
| Business Logic Layer |
    ↓
| Database (PostgreSQL) |
| Cache (Redis) |
| Storage (Cloudinary/S3) |
    ↓
| Background Workers |
| (Image Processing) |
    ↓
| CDN (Cloudflare) |

---

## 🎨 Frontend Layer

### Technologies:
- React (Web)
- React Native (Expo) (Mobile)

### Responsibilities:
- UI rendering
- API communication
- User interactions
- State management

---

## ⚙️ Backend Layer (API Server)

### Technologies:
- Node.js
- Express.js
- Prisma ORM

### Responsibilities:
- Authentication
- Post management
- Image upload handling
- Admin operations
- Business logic execution

---

## 🗄️ Database Layer

### Current:
- SQLite (Development)

### Production:
- PostgreSQL

### Responsibilities:
- Store users, posts, comments, likes
- Store metadata (hashes, flags, logs)
- Ensure data consistency

---

## 📦 Storage Layer

### Current:
- Local `/uploads`

### Production:
- Cloudinary / AWS S3

### Responsibilities:
- Store images
- Serve optimized media

---

## ⚡ Caching Layer

### Technology:
- Redis

### Purpose:
- Speed up frequently accessed data
- Reduce database load

---

## 🧠 Image Processing System

### Multi-layer detection:

1. SHA256 → exact match
2. pHash / dHash → similarity
3. ORB (OpenCV) → cropped detection
4. AI Embeddings → semantic similarity

---

## 🔄 Background Workers

### Purpose:
- Heavy tasks run asynchronously

### Tasks:
- Image hashing
- ORB processing
- AI embedding generation

---

## 🌐 CDN Layer

### Technology:
- Cloudflare

### Purpose:
- Fast image delivery
- Reduced latency worldwide

---

## 🔐 Authentication System

### Current:
- Basic email-based login

### Future:
- JWT authentication
- Session management

---

## 🛡️ Admin System

### Features:
- User control
- Content moderation
- Image detection
- Logs tracking

---

## 📈 Scalability Strategy

### Horizontal Scaling:
- Multiple backend servers

### Vertical Scaling:
- Increase server resources

---

## ⚠️ Bottlenecks to Watch

- Image processing (CPU heavy)
- Database queries (large data)
- File storage growth

---

## 🧠 Future Improvements

- Microservices architecture
- Kubernetes deployment
- AI-powered moderation