"use client";

import { createContext, useContext, useState } from "react";
import { mockUsers } from "@/lib/mock-data";
import type { User } from "@/lib/types";

interface UsersContextType {
  users: User[];
  updateUser: (id: string, changes: Partial<User>) => void;
  createUser: (user: User) => void;
  toggleStatus: (id: string) => void;
}

const UsersContext = createContext<UsersContextType | null>(null);

const STORAGE_KEY = "studiomate_users";

function syncMockUsers(users: User[]) {
  mockUsers.length = 0;
  users.forEach((u) => mockUsers.push(u));
}

function loadInitialUsers(): User[] {
  if (typeof window === "undefined") return mockUsers;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        syncMockUsers(parsed);
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return mockUsers;
}

function persistUsers(users: User[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch {
      // ignore
    }
  }
}

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(loadInitialUsers);

  function updateUser(id: string, changes: Partial<User>) {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, ...changes };
        const idx = mockUsers.findIndex((m) => m.id === id);
        if (idx !== -1) mockUsers[idx] = updated;
        return updated;
      });
      persistUsers(next);
      return next;
    });
  }

  function createUser(user: User) {
    mockUsers.push(user);
    setUsers((prev) => {
      const next = [...prev, user];
      persistUsers(next);
      return next;
    });
  }

  function toggleStatus(id: string) {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id !== id) return u;
        const updated: User = {
          ...u,
          status: u.status === "active" ? "inactive" : "active",
        };
        const idx = mockUsers.findIndex((m) => m.id === id);
        if (idx !== -1) mockUsers[idx] = updated;
        return updated;
      });
      persistUsers(next);
      return next;
    });
  }

  return (
    <UsersContext.Provider value={{ users, updateUser, createUser, toggleStatus }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}
