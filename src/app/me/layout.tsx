"use client";

import { MemberTopNav } from "@/components/layout/member-topnav";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MemberTopNav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </main>
    </>
  );
}
