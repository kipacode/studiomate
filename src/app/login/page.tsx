"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter your username and password.");
      return;
    }
    setLoading(true);

    if (username === "admin") {
      // Admin: authenticate against the real backend
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (res.ok) {
          login(username, password); // sync client-side AuthContext
          router.push("/dashboard");
          return;
        }
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Invalid credentials.");
      } catch {
        toast.error("Could not reach the server. Is the database running?");
      }
      setLoading(false);
      return;
    }

    // Non-admin: use mock login (no real password check needed yet)
    const success = login(username, password);
    if (success) {
      router.push("/me");
    } else {
      toast.error("User not found or inactive.");
      setLoading(false);
    }
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

        </CardContent>
      </Card>
    </div>
  );
}
