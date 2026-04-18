import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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

import { DEV_API_URL } from '../api';

const BACKEND_URL = DEV_API_URL; 

export const SocketProvider: React.FC<{ userId: number | undefined; children: React.ReactNode }> = ({ userId, children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    if (!userId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(BACKEND_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Mobile socket connected');
      newSocket.emit('register', userId);
    });

    newSocket.on('userStatusUpdate', ({ userId: uid, status }: { userId: number; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') next.add(uid);
        else next.delete(uid);
        return next;
      });
    });

    newSocket.on('userTyping', ({ userId: uid, isTyping }: { userId: number; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (isTyping) next.set(uid, true);
        else next.delete(uid);
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

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
