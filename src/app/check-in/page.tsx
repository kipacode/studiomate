"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { cn, getInitials, getRoleLabel } from "@/lib/utils";
import { Check, Clock, ArrowLeft, LogIn, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QrScanner } from "@/components/qr-scanner";
import { toast } from "sonner";

export default function CheckInPage() {
  const { user, isAuthenticated } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<"idle" | "checking" | "success">("idle");
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/attendance?date=${today}`)
      .then((r) => r.json())
      .then((d) => {
        const record = d.attendance?.[0];
        if (record?.checkInTime) {
          setCheckedIn(true);
          setCheckInTime(new Date(record.checkInTime));
        }
        if (record?.checkOutTime) setCheckedOut(true);
      })
      .catch(() => {});
  }, [user]);

  const isLateNow = currentTime.getHours() >= 8;

  function handleCheckIn() {
    setStatus("checking");
    setTimeout(() => {
      setStatus("success");
      setCheckedIn(true);
      setCheckInTime(new Date());
      setTimeout(() => setStatus("idle"), 2000);
    }, 1000);
  }

  function handleCheckOut() {
    setStatus("checking");
    setTimeout(() => {
      setCheckedOut(true);
      setStatus("idle");
    }, 1000);
  }

  async function handleScanSuccess(decodedText: string) {
    setIsScanning(false);
    setStatus("checking");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: decodedText }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setCheckedIn(true);
        setCheckInTime(new Date());
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("idle");
        toast.error(data.error || "Invalid or expired QR Code");
      }
    } catch {
      setStatus("idle");
      toast.error("Failed to check in. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background">
        <div
          className="absolute top-[-30%] left-[20%] w-[60%] h-[60%] rounded-full opacity-[0.03]"
          style={{
            background: "radial-gradient(circle, white 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto px-4 space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span className="text-sm font-semibold tracking-wide">
              Kipaworks Studio
            </span>
          </div>
        </div>

        <Card className="glass-strong animate-fade-in">
          <CardContent className="p-8">
            {!isAuthenticated ? (
              /* Not logged in */
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <LogIn className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-medium">
                    Please sign in to check in
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    You need to be logged in to record your attendance
                  </p>
                </div>
                <Button className="w-full">
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            ) : status === "success" ? (
              /* Success animation */
              <div className="text-center space-y-4 animate-fade-in">
                <div
                  className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto"
                  style={{
                    animation: "pulse-dot 1s ease-out",
                  }}
                >
                  <Check className="h-10 w-10 text-emerald-400" />
                </div>
                <h2 className="text-xl font-medium">Checked In!</h2>
                <p className="text-sm text-muted-foreground">
                  Your attendance has been recorded
                </p>
                {isLateNow && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/15 text-amber-400 border-amber-500/20"
                  >
                    Late Check-in
                  </Badge>
                )}
              </div>
            ) : (
              /* Main check-in UI */
              <div className="text-center space-y-6">
                {/* User avatar */}
                <Avatar className="h-16 w-16 mx-auto">
                  <AvatarFallback className="text-lg bg-muted">
                    {getInitials(user!.name)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h2 className="text-lg font-medium">{user!.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {getRoleLabel(user!.role)}
                  </p>
                </div>

                {/* Time */}
                <div className="text-3xl font-light tabular-nums tracking-wider">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}
                </div>
                <p className="text-sm text-muted-foreground -mt-4">
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>

                {/* Late warning */}
                {isLateNow && !checkedIn && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/15 text-amber-400 border-amber-500/20"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Late Check-in
                  </Badge>
                )}

                {/* Action */}
                {checkedOut ? (
                  <div className="space-y-2">
                    <div className="h-12 w-12 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto">
                      <Check className="h-6 w-6 text-sky-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Already checked out for today
                    </p>
                  </div>
                ) : checkedIn ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                      <span className="text-sm text-emerald-400">
                        Checked In
                      </span>
                    </div>
                    {checkInTime && (
                      <p className="text-xs text-muted-foreground">
                        Since{" "}
                        {checkInTime.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCheckOut}
                      disabled={status === "checking"}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {status === "checking" ? "Processing..." : "Check Out"}
                    </Button>
                  </div>
                ) : isScanning ? (
                  <div className="space-y-4 animate-fade-in">
                    <QrScanner 
                      onScanSuccess={handleScanSuccess} 
                      onScanFailure={() => {}} 
                    />
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setIsScanning(false)}
                    >
                      Cancel Scanning
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      className={cn(
                        "w-full h-12 text-base",
                        "bg-emerald-600 hover:bg-emerald-500 text-white"
                      )}
                      onClick={() => setIsScanning(true)}
                      disabled={status === "checking"}
                    >
                      {status === "checking" ? (
                        "Processing..."
                      ) : (
                        <>
                          <LogIn className="h-5 w-5 mr-2" />
                          Scan QR to Check In
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={handleCheckIn}
                      disabled={status === "checking"}
                    >
                      Check in manually (Demo)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="text-center">
          <Link
            href={isAuthenticated ? "/me" : "/login"}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
