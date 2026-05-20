"use client";

import { createContext, useContext, useState } from "react";
import { mockUsers } from "@/lib/mock-data";
import type { User, UserRole } from "@/lib/types";

interface UsersContextType {
  users: User[];
  updateUser: (id: string, changes: Partial<User>) => void;
  createUser: (user: User) => void;
  toggleStatus: (id: string) => void;
}

const UsersContext = createContext<UsersContextType | null>(null);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(mockUsers);

  function updateUser(id: string, changes: Partial<User>) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated = { ...u, ...changes };
        const idx = mockUsers.findIndex((m) => m.id === id);
        if (idx !== -1) mockUsers[idx] = updated;
        return updated;
      })
    );
  }

  function createUser(user: User) {
    mockUsers.push(user);
    setUsers((prev) => [...prev, user]);
  }

  function toggleStatus(id: string) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const updated: User = { ...u, status: u.status === "active" ? "inactive" : "active" };
        const idx = mockUsers.findIndex((m) => m.id === id);
        if (idx !== -1) mockUsers[idx] = updated;
        return updated;
      })
    );
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
