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
  bio?: string;
  isPrivate?: boolean;
  followStatus?: 'PENDING' | 'ACCEPTED' | null;
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
  phash: string;
  parentId: number | null;
  parent?: Post;
  comments?: Comment[];
  imagesCount?: number;
  imageUrls: string[];
  imagePaths: string[];
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
  isRead: boolean;
  createdAt: string;
}

export interface Story {
  id: number;
  userId: number;
  user: User;
  imageUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface UserStories {
  userId: number;
  user: User;
  stories: Story[];
}
