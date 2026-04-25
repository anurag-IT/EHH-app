import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { AUTH_TOKEN_KEY, USER_STORAGE_KEY } from "../api";

interface User {
  id: number;
  name: string;
  email?: string;
  uniqueId: string;
  avatar: string;
  role: string;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);

        validateSession(parsedUser.id).catch(() => {
          clearSession();
        });
      }
    } catch (e) {
      console.error("[Auth] Failed to restore session:", e);
    } finally {
      setLoading(false);
    }
  };

  const validateSession = async (userId: number) => {
    const res = await api.get(`/api/users/${userId}/profile`);
    if (res.data && res.data.id) {
      const nextUser: User = {
        id: res.data.id,
        name: res.data.name,
        email: res.data.email,
        uniqueId: res.data.uniqueId,
        avatar: res.data.avatar,
        role: res.data.role,
        status: res.data.status
      };
      setUser(nextUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    }
  };

  const clearSession = async () => {
    setUser(null);
    await AsyncStorage.multiRemove([USER_STORAGE_KEY, AUTH_TOKEN_KEY]);
  };

  const saveSession = async (userData: User, token: string) => {
    setUser(userData);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/api/users/login", {
      email: email.trim().toLowerCase(),
      password
    });
    await saveSession(res.data.user, res.data.token);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post("/api/users/register", {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password
    });
    await saveSession(res.data.user, res.data.token);
  };

  const logout = async () => {
    await clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
