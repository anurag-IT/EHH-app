import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api";

interface User {
  id: number;
  name: string;
  email: string;
  uniqueId: string;
  avatar: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  register: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const USER_STORAGE_KEY = "ehh_userData";
const USER_ID_KEY = "ehh_userId";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  /**
   * Restores user session from AsyncStorage on app launch / refresh.
   * This ensures the user stays signed in across app restarts.
   */
  const restoreSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);

        // Background validation: silently verify the stored user still
        // exists on the backend. If it fails, clear stale session.
        validateSession(parsedUser.id).catch(() => {
          clearSession();
        });
      }
    } catch (e) {
      console.error("[Auth] Failed to restore session:", e);
    } finally {
      // Always mark loading done so the app doesn't hang
      setLoading(false);
    }
  };

  /**
   * Pings the backend to confirm the stored user ID is still valid.
   * Called silently in the background after restoring from AsyncStorage.
   */
  const validateSession = async (userId: number) => {
    const res = await api.get(`/api/users/${userId}`);
    if (res.data && res.data.id) {
      // Refresh stored user data with latest from server
      setUser(res.data);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data));
    }
  };

  const clearSession = async () => {
    setUser(null);
    await AsyncStorage.multiRemove([USER_STORAGE_KEY, USER_ID_KEY]);
  };

  const saveSession = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    await AsyncStorage.setItem(USER_ID_KEY, userData.id.toString());
  };

  const login = async (email: string) => {
    const res = await api.post("/api/users/login", {
      email: email.trim().toLowerCase(),
    });
    await saveSession(res.data);
  };

  const register = async (name: string, email: string) => {
    const res = await api.post("/api/users/register", {
      name: name.trim(),
      email: email.trim().toLowerCase(),
    });
    await saveSession(res.data);
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
