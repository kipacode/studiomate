"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  cn,
  getInitials,
  getRoleColor,
  getRoleLabel,
  getInternProgress,
  getInternDaysRemaining,
  formatDate,
} from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

import { toast } from "sonner";

import {
  User as UserIcon,
  Mail,
  Shield,
  MapPin,
  GraduationCap,
  Lock,
  Save,
  Cake,
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  // Home location
  const [homeLabel, setHomeLabel] = useState(user?.homeLabel || "");
  const [homeLat, setHomeLat] = useState(
    user?.homeLat !== undefined ? String(user.homeLat) : ""
  );
  const [homeLng, setHomeLng] = useState(
    user?.homeLng !== undefined ? String(user.homeLng) : ""
  );

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Please log in to continue.</p>
      </div>
    );
  }

  const isIntern = user.role === "intern";
  const isEmployeeOrIntern =
    user.role === "employee" || user.role === "intern";

  function handleSave() {
    setIsSaving(true);
    // Simulate save delay
    setTimeout(() => {
      setIsSaving(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Profile updated successfully", {
        description: "Your changes have been saved.",
      });
    }, 800);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account settings
        </p>
      </div>

      {/* Avatar & Info */}
      <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
        <CardContent className="flex items-center gap-5 py-6">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 ring-2 ring-white/[0.06]">
            <span className="text-2xl font-semibold text-neutral-200">
              {getInitials(user.name)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{user.name}</h2>
            <p className="text-sm text-neutral-400">{user.email}</p>
            {user.birthDate && (
              <div className="flex items-center gap-1.5 text-sm text-neutral-400 mt-0.5">
                <Cake className="size-3.5" />
                {formatDate(user.birthDate)}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="secondary"
                className={cn("text-[10px]", getRoleColor(user.role))}
              >
                {getRoleLabel(user.role)}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px]",
                  user.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                {user.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <UserIcon className="size-4 text-neutral-400" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Role</Label>
              <div className="flex h-8 items-center">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getRoleColor(user.role))}
                >
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex h-8 items-center">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    user.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  )}
                >
                  {user.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Home Location */}
      {isEmployeeOrIntern && (
        <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="size-4 text-neutral-400" />
              Home Location
            </CardTitle>
            <CardDescription>
              This location will be used for future WFH check-in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="homeLabel">Location Label</Label>
              <Input
                id="homeLabel"
                value={homeLabel}
                onChange={(e) => setHomeLabel(e.target.value)}
                placeholder="e.g. Rumah Malang"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={homeLat}
                  onChange={(e) => setHomeLat(e.target.value)}
                  placeholder="-7.978"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={homeLng}
                  onChange={(e) => setHomeLng(e.target.value)}
                  placeholder="112.634"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Internship Info */}
      {isIntern && user.internshipStart && user.internshipEnd && (
        <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="size-4 text-amber-400" />
              Internship Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <div className="flex h-8 items-center text-sm text-neutral-300">
                  {formatDate(String(user.internshipStart))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <div className="flex h-8 items-center text-sm text-neutral-300">
                  {formatDate(String(user.internshipEnd))}
                </div>
              </div>
            </div>

            <Progress
              value={getInternProgress(
                String(user.internshipStart),
                String(user.internshipEnd)
              )}
            >
              <ProgressLabel className="text-xs text-neutral-400">
                Progress
              </ProgressLabel>
              <ProgressValue className="text-xs" />
            </Progress>

            <p className="text-sm text-amber-400/80 font-medium">
              {getInternDaysRemaining(String(user.internshipEnd))} days remaining
            </p>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <Card className="border-0 bg-neutral-900/50 ring-1 ring-white/[0.04]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="size-4 text-neutral-400" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          {newPassword &&
            confirmPassword &&
            newPassword !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match.</p>
            )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <Button
          size="lg"
          className="gap-2 min-w-[140px]"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Save className="size-4" />
          )}
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
