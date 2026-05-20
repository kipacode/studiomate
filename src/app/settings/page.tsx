"use client";

import { useState } from "react";
import {
  Users,
  QrCode,
  Tag,
  MapPin,
  Plus,
  Search,
  Pencil,
  ToggleLeft,
  Trash2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { User, UserRole, QRToken, Location } from "@/lib/types";
import { mockUsers, mockQRTokens, mockLocations, activityCategories } from "@/lib/mock-data";
import {
  cn,
  formatDate,
  getRoleColor,
  getRoleLabel,
  getInitials,
  todayStr,
} from "@/lib/utils";

// ── User Management Tab ──────────────────────────────────────────

function UserManagementTab() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    birthDate: "",
    role: "employee" as UserRole,
    status: "active" as "active" | "inactive",
    internshipStart: "",
    internshipEnd: "",
  });

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function openCreateDialog() {
    setEditUser(null);
    setFormData({
      name: "",
      username: "",
      email: "",
      birthDate: "",
      role: "employee",
      status: "active",
      internshipStart: "",
      internshipEnd: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      birthDate: user.birthDate || "",
      role: user.role,
      status: user.status,
      internshipStart: user.internshipStart || "",
      internshipEnd: user.internshipEnd || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!formData.name || !formData.username || !formData.email) {
      toast.error("Name, username and email are required");
      return;
    }
    if (editUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? { ...u, ...formData, birthDate: formData.birthDate || undefined, internshipStart: formData.internshipStart || undefined, internshipEnd: formData.internshipEnd || undefined }
            : u
        )
      );
      toast.success("User updated successfully");
    } else {
      const newUser: User = {
        id: `u-${Date.now()}`,
        ...formData,
        password: "hashed",
        birthDate: formData.birthDate || undefined,
        internshipStart: formData.internshipStart || undefined,
        internshipEnd: formData.internshipEnd || undefined,
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
      toast.success("User created successfully");
    }
    setDialogOpen(false);
  }

  function toggleStatus(userId: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "active" ? "inactive" : "active" }
          : u
      )
    );
    toast.success("User status updated");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage team member accounts and roles
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-muted">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getRoleColor(user.role))}
                    >
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        user.status === "active"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : "bg-neutral-500/15 text-neutral-400 border-neutral-500/20"
                      )}
                    >
                      {user.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(user)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleStatus(user.id)}
                      >
                        <ToggleLeft className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editUser ? "Edit User" : "Create New User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, username: e.target.value }))
                }
                placeholder="e.g. rizky"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="email@kipaworks.studio"
              />
            </div>
            <div className="space-y-2">
              <Label>Birth Date</Label>
              <Input
                type="date"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, birthDate: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, role: v as UserRole }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="intern">Intern (PKL)</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((f) => ({
                      ...f,
                      status: v as "active" | "inactive",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.role === "intern" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Internship Start</Label>
                  <Input
                    type="date"
                    value={formData.internshipStart}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        internshipStart: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Internship End</Label>
                  <Input
                    type="date"
                    value={formData.internshipEnd}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        internshipEnd: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editUser ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── QR Code Tab ──────────────────────────────────────────────────

function QRCodeTab() {
  const [tokens, setTokens] = useState<QRToken[]>(mockQRTokens);
  const [copied, setCopied] = useState(false);

  const activeToken = tokens.find(
    (t) => t.validDate === todayStr() && t.isActive
  );

  function generateToken() {
    const newToken: QRToken = {
      id: `qr-${Date.now()}`,
      token: `KIPA-${todayStr().replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      validDate: todayStr(),
      createdBy: "u-001",
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setTokens((prev) =>
      prev.map((t) =>
        t.validDate === todayStr() ? { ...t, isActive: false } : t
      ).concat(newToken)
    );
    toast.success("New QR token generated");
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Token copied to clipboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">QR Code Management</h2>
          <p className="text-sm text-muted-foreground">
            Generate and manage daily check-in QR codes
          </p>
        </div>
        <Button onClick={generateToken} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate New Token
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-6">
            {/* QR Code Visual Representation */}
            <div className="relative w-48 h-48 bg-white rounded-xl flex items-center justify-center p-4">
              <div className="grid grid-cols-8 gap-0.5 w-full h-full">
                {Array.from({ length: 64 }).map((_, i) => {
                  const isCorner =
                    (i < 3 || (i >= 5 && i < 8)) &&
                    (Math.floor(i / 8) < 3 || Math.floor(i / 8) >= 5);
                  const isFilled =
                    isCorner ||
                    Math.abs(
                      Math.sin(i * 2.5 + (activeToken?.token.length || 0))
                    ) > 0.4;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-[1px]",
                        isFilled ? "bg-neutral-900" : "bg-neutral-100"
                      )}
                    />
                  );
                })}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white px-2 py-1 rounded text-[8px] font-mono text-neutral-900 font-bold">
                  KIPA
                </div>
              </div>
            </div>

            {activeToken ? (
              <div className="text-center space-y-2">
                <div className="flex items-center gap-2 justify-center">
                  <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-md">
                    {activeToken.token}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToken(activeToken.token)}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Valid for {formatDate(activeToken.validDate)}
                </p>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                >
                  Active
                </Badge>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  No active token for today
                </p>
                <Button onClick={generateToken} size="sm">
                  Generate Token
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Token History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Valid Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      <code className="text-xs font-mono">{token.token}</code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(token.validDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          token.isActive
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                            : "bg-neutral-500/15 text-neutral-400 border-neutral-500/20"
                        )}
                      >
                        {token.isActive ? "Active" : "Expired"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(token.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Categories Tab ───────────────────────────────────────────────

function CategoriesTab() {
  const [categories, setCategories] = useState<Array<{ value: string; label: string; isDefault?: boolean }>>(
    activityCategories.map((c) => ({ ...c, isDefault: true }))
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const categoryColors = [
    "bg-pink-500/15 text-pink-400 border-pink-500/20",
    "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    "bg-neutral-500/15 text-neutral-400 border-neutral-500/20",
    "bg-orange-500/15 text-orange-400 border-orange-500/20",
    "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    "bg-stone-500/15 text-stone-400 border-stone-500/20",
    "bg-violet-500/15 text-violet-400 border-violet-500/20",
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ];

  function addCategory() {
    if (!newCategory.trim()) return;
    setCategories((prev) => [
      ...prev,
      {
        value: newCategory.toLowerCase().replace(/\s+/g, "_"),
        label: newCategory,
        isDefault: false,
      },
    ]);
    setNewCategory("");
    setDialogOpen(false);
    toast.success("Category added");
  }

  function deleteCategory(value: string) {
    const cat = categories.find((c) => c.value === value);
    if (cat?.isDefault) {
      toast.error("Default categories cannot be deleted");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.value !== value));
    toast.success("Category deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Activity Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage categories for activity logs
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-3">
        {categories.map((cat, i) => (
          <Card key={cat.value}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-sm",
                    categoryColors[i % categoryColors.length]
                  )}
                >
                  {cat.label}
                </Badge>
                {cat.isDefault && (
                  <span className="text-xs text-muted-foreground">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toast.info("Edit coming soon")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteCategory(cat.value)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Marketing"
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Location Tab ─────────────────────────────────────────────────

function LocationTab() {
  const [location, setLocation] = useState<Location>(mockLocations[0]);
  const [editing, setEditing] = useState(false);

  function handleSave() {
    setEditing(false);
    toast.success("Location updated successfully");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Office Location</h2>
          <p className="text-sm text-muted-foreground">
            Register and manage your studio location
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)} size="sm" variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={location.label}
                onChange={(e) =>
                  setLocation((l) => ({ ...l, label: e.target.value }))
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={location.address}
                onChange={(e) =>
                  setLocation((l) => ({ ...l, address: e.target.value }))
                }
                disabled={!editing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={location.lat}
                  onChange={(e) =>
                    setLocation((l) => ({
                      ...l,
                      lat: parseFloat(e.target.value),
                    }))
                  }
                  disabled={!editing}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={location.lng}
                  onChange={(e) =>
                    setLocation((l) => ({
                      ...l,
                      lng: parseFloat(e.target.value),
                    }))
                  }
                  disabled={!editing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check-in Radius (meters)</Label>
              <Input
                type="number"
                value={location.radiusMeters}
                onChange={(e) =>
                  setLocation((l) => ({
                    ...l,
                    radiusMeters: parseInt(e.target.value),
                  }))
                }
                disabled={!editing}
              />
            </div>
            {editing && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave}>Save Changes</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setLocation(mockLocations[0]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map Placeholder */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 h-full min-h-[320px] relative bg-muted/30">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{location.label}</p>
                <p className="text-sm mt-1">{location.address}</p>
                <p className="text-xs mt-2 font-mono">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  Radius: {location.radiusMeters}m
                </Badge>
              </div>
            </div>
            {/* Decorative grid lines */}
            <div className="absolute inset-0 opacity-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute w-full border-t border-foreground"
                  style={{ top: `${(i + 1) * 10}%` }}
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="absolute h-full border-l border-foreground"
                  style={{ left: `${(i + 1) * 10}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Settings Page ────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your studio configuration
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="qr" className="gap-2">
            <QrCode className="h-4 w-4" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="location" className="gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>
        <TabsContent value="qr">
          <QRCodeTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="location">
          <LocationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
