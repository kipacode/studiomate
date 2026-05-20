"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (isAdmin) {
      router.replace("/dashboard");
    } else {
      router.replace("/me");
    }
  }, [isAuthenticated, isAdmin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse-dot h-3 w-3 rounded-full bg-foreground/30" />
    </div>
  );
}
