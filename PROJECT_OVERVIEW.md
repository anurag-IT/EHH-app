# 🌱 EHH – Smart Social Image Tracking Platform

## 🧠 Project Idea
EHH is a social media platform focused on **image tracking, repost detection, and content moderation**.

Core idea:
- Users can post images
- System detects duplicates, reposts, and edited versions
- Admin can track, analyze, and remove harmful or repeated content
- Platform ensures **content authenticity and safety**

---

## 🚀 Core Features

### 👤 User Features
- User registration & login
- Post images with captions
- Like, comment, repost system
- Report inappropriate content
- View feed (similar to Instagram)
- Profile system

---

### 🛡️ Admin Features
- Full admin dashboard
- User management (ban/unban/delete)
- Flagged content review system
- Image detection system
- Global delete of similar images
- Admin logs (tracking actions)

---

### 🔍 Image Detection System (Core Innovation)

Multi-layer detection system:

1. SHA256 → Exact match detection
2. Perceptual Hash (pHash) → Similar images
3. dHash / aHash → Structural similarity
4. (Planned) ORB → Cropped / partial matches
5. (Planned) AI Embeddings → Semantic similarity

Goal:
👉 Detect reposts, screenshots, cropped, and edited images

---

## 🧱 Tech Stack

### 🎨 Frontend
- React (Web)
- React Native (Expo) (Mobile - in progress)
- Tailwind CSS

---

### ⚙️ Backend
- Node.js
- Express.js
- Prisma ORM

---

### 🗄️ Database (Current)
- SQLite (development)

### 🔄 Future Upgrade
- PostgreSQL (production scale)

---

### 📦 Storage (Current)
- Local file storage (`/uploads`)

### 🔄 Future Upgrade
- Cloud Storage (Cloudinary / AWS S3)

---

### 🧠 Future AI Stack
- OpenCV (ORB matching)
- TensorFlow / MobileNet (embeddings)

---

## 🎨 UI/UX Design

- Dark theme UI
- Green-based branding
- Mobile-first design
- Smooth animations (lightweight)
- Instagram-inspired layout

---

## 📱 App Structure

- Auth (Login / Signup)
- Home Feed
- Image Search / Detection
- Upload System
- Profile Page
- Admin Panel

---

## ⚠️ Current Limitations

- Image detection not accurate for cropped/screenshot images
- Uses local storage (not scalable)
- SQLite not suitable for production
- No background job processing yet
- Basic UI (being upgraded)

---

## 🎯 Future Goals

### 🔥 High Priority
- Improve image detection accuracy
- Implement ORB + AI matching
- Upgrade database to PostgreSQL
- Move storage to cloud
- Build production-level admin panel

---

### 🚀 Scaling Goals
- Handle millions of users
- Add caching (Redis)
- Add CDN (Cloudflare)
- Background workers for image processing

---

## 🧪 Testing Strategy

- Manual testing via admin panel
- Upload same / cropped / edited images
- Validate similarity detection

---

## 🧠 Developer Notes

- Do NOT break existing features while updating
- Maintain backward compatibility
- Optimize performance (important for scaling)
- Avoid unnecessary UI complexity

---

## 📌 Project Status

🟡 In Development  
Goal: Production-ready scalable application

---

## 🧑‍💻 Maintained By
- Built using AI-assisted development (ChatGPT + Antigravity)
- Developer: [Your Name]