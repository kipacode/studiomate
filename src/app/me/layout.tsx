"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { MemberTopNav } from "@/components/layout/member-topnav";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <>
      <MemberTopNav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </main>
    </>
  );
}
