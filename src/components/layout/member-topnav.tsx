"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn, getRoleLabel } from "@/lib/utils";
import { LogOut, User as UserIcon, Home, Users, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoodAvatar } from "@/components/ui/mood-avatar";

const navLinks = [
  { label: "My Dashboard", shortLabel: "Home", href: "/me", icon: Home },
  { label: "Team", shortLabel: "Team", href: "/me/team", icon: Users },
  { label: "History", shortLabel: "History", href: "/me/history", icon: History },
];

function isLinkActive(pathname: string, href: string) {
  return href === "/me" ? pathname === "/me" : pathname.startsWith(href);
}

export function MemberTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 glass border-b border-border/50">
      <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
        {/* Brand */}
        <Link href="/me" className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
          <span className="text-sm font-semibold tracking-wide">
            Kipaworks Studio
          </span>
        </Link>

        {/* Nav Links (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = isLinkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex h-8 items-center gap-2 px-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                <MoodAvatar
                  mood={user.mood}
                  name={user.name}
                  className="size-6 text-[10px] ring-1"
                />
                <span className="text-sm hidden sm:inline">{user.name}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getRoleLabel(user.role)}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/me/profile" className="cursor-pointer flex items-center w-full">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

export function MemberBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 glass border-t border-border/50 md:hidden">
      <div className="flex h-full items-stretch justify-around px-2">
        {navLinks.map((link) => {
          const isActive = isLinkActive(pathname, link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-foreground" />
              )}
              <Icon className="size-5" />
              {link.shortLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
