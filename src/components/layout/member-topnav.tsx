"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn, getInitials, getRoleLabel } from "@/lib/utils";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "My Dashboard", href: "/me" },
  { label: "Activity Log", href: "/me/activity" },
  { label: "History", href: "/me/history" },
];

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

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/me"
                ? pathname === "/me"
                : pathname.startsWith(link.href);
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
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-muted">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
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
