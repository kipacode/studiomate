"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User, UserRole } from "./types";
import { mockUsers } from "./mock-data";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => boolean;
  loginFromAPI: (user: User) => void;
  loginAs: (role: UserRole) => void;
  logout: () => void;
  updateCurrentUser: (changes: Partial<User>) => void;
  isAdmin: boolean;
  isMember: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "studiomate_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    async function restore() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.fromAPI) {
            // Verify session cookie is still valid and get fresh user data
            const res = await fetch("/api/auth/me");
            if (res.ok) {
              const data = await res.json();
              setUser(data.user);
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          } else {
            const found = mockUsers.find((u) => u.id === parsed.id);
            if (found && found.status === "active") {
              setUser(found);
            }
          }
        }
      } catch {
        // ignore
      }
      setIsLoading(false);
    }
    restore();
  }, []);

  const login = useCallback((username: string, _password: string): boolean => {
    const found = mockUsers.find(
      (u) => u.username === username && u.status === "active"
    );
    if (found) {
      setUser(found);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: found.id }));
      return true;
    }
    return false;
  }, []);

  const loginFromAPI = useCallback((apiUser: User) => {
    setUser(apiUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: apiUser.id, fromAPI: true }));
  }, []);

  const loginAs = useCallback((role: UserRole) => {
    const found = mockUsers.find(
      (u) => u.role === role && u.status === "active"
    );
    if (found) {
      setUser(found);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: found.id }));
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateCurrentUser = useCallback((changes: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  const isAdmin = user?.role === "admin";
  const isMember = !!user && user.role !== "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginFromAPI,
        loginAs,
        logout,
        updateCurrentUser,
        isAdmin,
        isMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
