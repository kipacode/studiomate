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
      prev.map((u) => (u.id === id ? { ...u, ...changes } : u))
    );
  }

  function createUser(user: User) {
    setUsers((prev) => [...prev, user]);
  }

  function toggleStatus(id: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "active" ? "inactive" : "active" }
          : u
      )
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
