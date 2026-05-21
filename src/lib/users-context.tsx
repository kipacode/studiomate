"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types";

interface UsersContextType {
  users: User[];
  loading: boolean;
  refreshUsers: () => Promise<void>;
  updateUser: (id: string, changes: Partial<User>) => Promise<void>;
  createUser: (user: Partial<User> & { password: string }) => Promise<User>;
  toggleStatus: (id: string) => Promise<void>;
}

const UsersContext = createContext<UsersContextType | null>(null);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  async function updateUser(id: string, changes: Partial<User>) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (!res.ok) throw new Error("Failed to update user");
    const { user } = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
  }

  async function createUser(data: Partial<User> & { password: string }): Promise<User> {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to create user");
    }
    const { user } = await res.json();
    setUsers((prev) => [...prev, user]);
    return user;
  }

  async function toggleStatus(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const newStatus = user.status === "active" ? "inactive" : "active";
    await updateUser(id, { status: newStatus });
  }

  return (
    <UsersContext.Provider value={{ users, loading, refreshUsers, updateUser, createUser, toggleStatus }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}
