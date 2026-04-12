export interface User {
  id: number;
  name: string;
  email: string;
  uniqueId: string;
  avatar: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BANNED" | "PERMANENT_BAN";
  banReason?: string;
  banUntil?: string;
  _count?: {
    posts: number;
    followers: number;
    following: number;
  }
}

export interface Comment {
  id: number;
  text: string;
  user: User;
  createdAt: string;
}

export interface Post {
  id: number;
  userId: number;
  user: User;
  imagePath: string;
  imageUrl?: string;
  caption: string;
  location?: string;
  sha256: string;
  phash: string;
  parentId: number | null;
  parent?: Post;
  comments?: Comment[];
  createdAt: string;
  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  _count?: {
    likes: number;
    comments: number;
    reposts: number;
  }
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
}
