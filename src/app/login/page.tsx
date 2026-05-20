"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserRole } from "@/lib/types";
import { Shield, User, GraduationCap, Briefcase } from "lucide-react";

const roleButtons: { role: UserRole; label: string; icon: React.ReactNode }[] = [
  { role: "admin", label: "Admin", icon: <Shield className="h-3.5 w-3.5" /> },
  { role: "employee", label: "Employee", icon: <User className="h-3.5 w-3.5" /> },
  { role: "intern", label: "Intern", icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { role: "freelancer", label: "Freelancer", icon: <Briefcase className="h-3.5 w-3.5" /> },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginAs } = useAuth();
  const router = useRouter();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const success = login(username, password);
    if (success) {
      router.push(username === "admin" ? "/dashboard" : "/me");
    } else {
      toast.error("Invalid credentials. Try a quick access button below.");
      setLoading(false);
    }
  }

  function handleQuickLogin(role: UserRole) {
    loginAs(role);
    router.push(role === "admin" ? "/dashboard" : "/me");
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-background">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.03]"
          style={{
            background: "radial-gradient(circle, white 0%, transparent 70%)",
            animation: "pulse-dot 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.02]"
          style={{
            background: "radial-gradient(circle, white 0%, transparent 70%)",
            animation: "pulse-dot 10s ease-in-out infinite 2s",
          }}
        />
      </div>

      <Card className="w-full max-w-sm glass-strong animate-fade-in relative z-10">
        <CardContent className="p-8">
          {/* Branding */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light tracking-wide">
              Kipaworks Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">StudioMate</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g. admin, rizky"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Quick Access */}
          <div className="mt-6">
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                Quick Access
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {roleButtons.map(({ role, label, icon }) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => handleQuickLogin(role)}
                >
                  {icon}
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
