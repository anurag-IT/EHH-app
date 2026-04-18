import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Message } from '../types';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Set<number>;
  typingUsers: Map<number, boolean>;
  markAsRead: (senderId: number) => void;
  sendMessage: (receiverId: number, content: string) => void;
  sendTyping: (receiverId: number, isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export const SocketProvider: React.FC<{ user: User | null; children: React.ReactNode }> = ({ user, children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Use the origin directly - Vite proxy in vite.config.ts will handle /socket.io
    const newSocket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Allow both for maximum compatibility
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('register', user.id);
    });

    newSocket.on('userStatusUpdate', ({ userId, status }: { userId: number; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    newSocket.on('userTyping', ({ userId, isTyping }: { userId: number; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (isTyping) next.set(userId, true);
        else next.delete(userId);
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const markAsRead = useCallback((senderId: number) => {
    socket?.emit('markAsRead', { senderId });
  }, [socket]);

  const sendMessage = useCallback((receiverId: number, content: string) => {
    socket?.emit('sendMessage', { receiverId, content });
  }, [socket]);

  const sendTyping = useCallback((receiverId: number, isTyping: boolean) => {
    socket?.emit('typing', { receiverId, isTyping });
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, typingUsers, markAsRead, sendMessage, sendTyping }}>
      {children}
    </SocketContext.Provider>
  );
};
