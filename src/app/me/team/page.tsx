"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { MoodAvatar } from "@/components/ui/mood-avatar";
import { getMood, MOODS } from "@/lib/moods";
import { cn, getRoleColor, getRoleLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";

const REFRESH_INTERVAL = 30_000;

function formatAgo(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}

function MoodCard({ member, isMe }: { member: User; isMe: boolean }) {
  const def = getMood(member.mood);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-2xl p-5 transition-all",
        isMe
          ? "border border-white/20 bg-white/[0.06] ring-1 ring-white/10"
          : "border border-white/[0.05] bg-neutral-900/40",
        !def && "opacity-60"
      )}
    >
      {isMe && (
        <span className="absolute top-3 right-3 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-neutral-400">
          You
        </span>
      )}

      <MoodAvatar mood={member.mood} name={member.name} className="size-20" />

      <div className="flex w-full flex-col items-center gap-1.5 text-center">
        <p className="line-clamp-2 w-full break-words text-center text-sm font-medium leading-tight text-white">
          {member.name}
        </p>
        <Badge
          variant="secondary"
          className={cn("text-[10px]", getRoleColor(member.role))}
        >
          {getRoleLabel(member.role)}
        </Badge>

        {def ? (
          <div className="mt-0.5 flex flex-col items-center gap-0.5">
            <span className={cn("text-xs font-semibold", def.text)}>
              {def.label}
            </span>
            <span className="text-[10px] text-neutral-500">{def.description}</span>
          </div>
        ) : (
          <span className="mt-0.5 text-[11px] text-neutral-600">
            No mood set
          </span>
        )}
      </div>
    </div>
  );
}

export default function TeamMoodPage() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [tick, setTick] = useState(0);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?status=active");
      if (res.ok) {
        const data = await res.json();
        const team = (data.users as User[]).filter((u) => u.role !== "admin");
        // Sort: mood-set members first, then alphabetically
        team.sort((a, b) => {
          if (a.mood && !b.mood) return -1;
          if (!a.mood && b.mood) return 1;
          return a.name.localeCompare(b.name);
        });
        setMembers(team);
        setLastRefresh(new Date());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Auto-refresh every 30s + on tab focus
  useEffect(() => {
    const interval = setInterval(fetchMembers, REFRESH_INTERVAL);
    const handleVisibility = () => {
      if (!document.hidden) fetchMembers();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchMembers]);

  // "X ago" ticker
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);
  void tick; // suppress unused warning

  // ── Stats ──────────────────────────────────────────────────────────
  const withMood = members.filter((m) => m.mood);
  const moodCounts = MOODS.map((m) => ({
    ...m,
    count: members.filter((u) => u.mood === m.key).length,
  })).filter((m) => m.count > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Mood</h1>
          <p className="mt-0.5 text-sm text-neutral-400">
            See how everyone on the team is feeling right now
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-neutral-900/60 px-3 py-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] text-neutral-400">
            Live · {formatAgo(lastRefresh)}
          </span>
        </div>
      </div>

      {/* Mood distribution bar */}
      {moodCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {moodCounts.map((m) => (
            <div
              key={m.key}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1",
                m.text
              )}
            >
              <span className="text-xs font-medium">{m.label}</span>
              <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {m.count}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.04] px-3 py-1 text-neutral-600">
            <span className="text-xs">{withMood.length}/{members.length} sharing</span>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl border border-white/[0.05] bg-neutral-900/40"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((member) => (
            <MoodCard
              key={member.id}
              member={member}
              isMe={member.id === currentUser?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
