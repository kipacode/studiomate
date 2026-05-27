"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/components/qr-scanner";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Upload, Key, QrCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState<"qr" | "credentials">("qr");
  const [qrMode, setQrMode] = useState<"camera" | "upload" | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"check-in" | "leave">("check-in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanningFile, setScanningFile] = useState(false);
  const { loginFromAPI } = useAuth();
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter your username and password.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        loginFromAPI(data.user);
        router.push(data.user.role === "admin" ? "/dashboard" : "/me");
        return;
      }
      toast.error(data.error ?? "Invalid credentials.");
    } catch {
      toast.error("Could not reach the server. Is the database running?");
    }
    setLoading(false);
  }

  async function handleQrLogin(qrContent: string) {
    if (!qrContent) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/qr-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrContent, status: selectedStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        loginFromAPI(data.user);
        toast.success(`Welcome back, ${data.user.name}!`);
        router.push(data.user.role === "admin" ? "/dashboard" : "/me");
        return;
      }
      toast.error(data.error ?? "Login failed. Invalid QR code.");
    } catch {
      toast.error("Could not reach the server. Is the database running?");
    } finally {
      setLoading(false);
      setQrMode(null);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
    setScanningFile(true);

    // Html5Qrcode.scanFile() requires a DOM element that is NOT display:none.
    // We create a temporary off-screen container, append it to body, scan, then remove it.
    const tempId = "qr-file-reader-temp-" + Date.now();
    const tempDiv = document.createElement("div");
    tempDiv.id = tempId;
    tempDiv.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:300px;height:300px;visibility:hidden;pointer-events:none;";
    document.body.appendChild(tempDiv);

    const html5QrCode = new Html5Qrcode(tempId);
    try {
      const decodedText = await html5QrCode.scanFile(file, false);
      await handleQrLogin(decodedText);
    } catch (err) {
      console.error("QR file scan error:", err);
      toast.error("No valid QR code detected in this image. Please try again.");
    } finally {
      setScanningFile(false);
      try { html5QrCode.clear(); } catch {}
      try { document.body.removeChild(tempDiv); } catch {}
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-background">
        <div
          className="absolute top-[-15%] left-[-10%] w-[100%] h-[80%] rounded-full"
          style={{
            background: "radial-gradient(ellipse, white 0%, transparent 70%)",
            animation: "pulse-glow 8s ease-in-out infinite",
            ["--pulse-max" as never]: "0.5",
            ["--pulse-min" as never]: "0.25",
          }}
        />
        <div
          className="absolute bottom-[-15%] right-[-10%] w-[90%] h-[70%] rounded-full"
          style={{
            background: "radial-gradient(ellipse, white 0%, transparent 70%)",
            animation: "pulse-glow 10s ease-in-out infinite 2s",
            ["--pulse-max" as never]: "0.4",
            ["--pulse-min" as never]: "0.2",
          }}
        />
      </div>

      <Card className="w-full max-w-sm glass-strong animate-fade-in relative z-10">
        <CardContent className="p-8">
          {/* Branding */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-light tracking-wide">
              Kipaworks Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">StudioMate</p>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1 bg-neutral-900/60 p-1 rounded-lg border border-white/[0.04] mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMode("qr");
                setQrMode(null);
              }}
              className={cn(
                "py-2 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5",
                loginMode === "qr"
                  ? "bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]"
              )}
            >
              <QrCode className="h-3.5 w-3.5" />
              QR Code Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("credentials")}
              className={cn(
                "py-2 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5",
                loginMode === "credentials"
                  ? "bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]"
              )}
            >
              <Key className="h-3.5 w-3.5" />
              Credentials
            </button>
          </div>

          {/* QR Login Mode */}
          {loginMode === "qr" && (
            <div className="space-y-5">
              {/* Attendance Status Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-neutral-300">Attendance Status for Today</Label>
                <div className="grid grid-cols-2 gap-2 bg-neutral-900/60 p-1 rounded-lg border border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("check-in")}
                    className={cn(
                      "py-2 text-xs font-medium rounded-md transition-all duration-200",
                      selectedStatus === "check-in"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]"
                    )}
                  >
                    Check-in
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStatus("leave")}
                    className={cn(
                      "py-2 text-xs font-medium rounded-md transition-all duration-200",
                      selectedStatus === "leave"
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]"
                    )}
                  >
                    On Leave
                  </button>
                </div>
              </div>

              {/* QR Options */}
              {qrMode === null ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex flex-col items-center justify-center h-28 gap-2 hover:bg-white/[0.04] transition-all border-dashed border-white/10"
                    onClick={() => setQrMode("camera")}
                  >
                    <Camera className="h-5 w-5 text-emerald-400" />
                    <span className="text-xs font-medium">Scan ID Card</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex flex-col items-center justify-center h-28 gap-2 hover:bg-white/[0.04] transition-all border-dashed border-white/10"
                    onClick={() => setQrMode("upload")}
                  >
                    <Upload className="h-5 w-5 text-sky-400" />
                    <span className="text-xs font-medium">Upload QR File</span>
                  </Button>
                </div>
              ) : qrMode === "camera" ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="relative">
                    <QrScanner
                      onScanSuccess={handleQrLogin}
                      onScanFailure={() => {}}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-neutral-400 hover:text-neutral-200"
                    onClick={() => setQrMode(null)}
                  >
                    Back to options
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center border border-dashed rounded-lg p-6 bg-neutral-900/40 relative transition-colors cursor-pointer",
                      scanningFile
                        ? "border-sky-500/30 bg-sky-900/10 cursor-wait"
                        : "border-white/10 hover:bg-neutral-900/60 hover:border-white/20"
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={loading || scanningFile}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                    />
                    {scanningFile ? (
                      <Loader2 className="h-7 w-7 text-sky-400 mb-2 animate-spin" />
                    ) : (
                      <Upload className="h-7 w-7 text-neutral-500 mb-2 group-hover:text-neutral-400 transition-colors" />
                    )}
                    <p className="text-xs text-neutral-300 font-medium text-center">
                      {scanningFile ? "Reading QR code…" : "Click or drag to upload QR image"}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1 text-center">
                      {scanningFile ? "Please wait" : "Supports JPG, PNG, WEBP"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-neutral-400 hover:text-neutral-200"
                    onClick={() => setQrMode(null)}
                  >
                    Back to options
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Credentials Login Mode */}
          {loginMode === "credentials" && (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
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
          )}

        </CardContent>
      </Card>
    </div>
  );
}
