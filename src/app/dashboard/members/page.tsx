'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Mail,
  Calendar,
  Cake,
  Pencil,
  ToggleLeft,
  Plus,
  Trash2,
  PencilLine,
} from 'lucide-react';
import { useUsers } from '@/lib/users-context';
import { useAuth } from '@/lib/auth-context';
import type { User, UserRole } from '@/lib/types';
import { toast } from 'sonner';
import {
  cn,
  formatTime,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getRoleColor,
  getRoleLabel,
  getInternProgress,
  getInternDaysRemaining,
  todayStr,
} from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoodAvatar } from '@/components/ui/mood-avatar';
import { getMood } from '@/lib/moods';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

// ── Types ────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean;
  status?: string;
  correctedBy?: string | null;
  correctedAt?: string | null;
  correctionNote?: string | null;
}

type AttendanceStatus = 'checked_in' | 'late' | 'checked_out' | 'not_yet' | 'leave';

function resolveStatus(record?: AttendanceRecord): AttendanceStatus {
  if (!record) return 'not_yet';
  if (record.status === 'leave') return 'leave';
  if (!record.checkInTime) return 'not_yet';
  if (record.checkOutTime) return 'checked_out';
  if (record.isLate) return 'late';
  return 'checked_in';
}

// ── Date / time helpers (local-tz friendly) ────────────────────────

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function timeFromIso(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function combineDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  // Local time; .toISOString() converts to UTC for transport.
  return new Date(`${date}T${time}:00`).toISOString();
}

// ── Attendance Form Dialog (create + edit) ─────────────────────────

interface AttendanceFormState {
  date: string;
  status: 'check-in' | 'leave';
  checkInTime: string; // HH:mm
  checkOutTime: string; // HH:mm
  correctionNote: string;
}

interface AttendanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  userId: string;
  userName: string;
  record?: AttendanceRecord | null;
  onSaved: () => void;
}

function initialFormState(
  mode: 'create' | 'edit',
  record: AttendanceRecord | null | undefined,
): AttendanceFormState {
  if (mode === 'edit' && record) {
    return {
      date: record.date,
      status: record.status === 'leave' ? 'leave' : 'check-in',
      checkInTime: timeFromIso(record.checkInTime),
      checkOutTime: timeFromIso(record.checkOutTime),
      correctionNote: '',
    };
  }
  return {
    date: todayStr(),
    status: 'check-in',
    checkInTime: '09:00',
    checkOutTime: '17:00',
    correctionNote: '',
  };
}

// Parent remounts this component (via key) when switching between create/edit
// or selecting a different record, so the form derives its initial state once.
function AttendanceFormDialog({
  open,
  onOpenChange,
  mode,
  userId,
  userName,
  record,
  onSaved,
}: AttendanceFormDialogProps) {
  const [form, setForm] = useState<AttendanceFormState>(() => initialFormState(mode, record));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.correctionNote.trim()) {
      toast.error('Reason / note is required');
      return;
    }
    if (form.status === 'check-in' && !form.checkInTime) {
      toast.error('Check-in time required');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        const res = await fetch('/api/attendance/admin-backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            date: form.date,
            status: form.status,
            checkInTime:
              form.status === 'leave' ? null : combineDateTime(form.date, form.checkInTime),
            checkOutTime:
              form.status === 'leave' || !form.checkOutTime
                ? null
                : combineDateTime(form.date, form.checkOutTime),
            correctionNote: form.correctionNote.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to save');
        toast.success('Attendance backfilled');
      } else if (record) {
        const res = await fetch(`/api/attendance/${record.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: form.status,
            checkInTime:
              form.status === 'leave' ? null : combineDateTime(form.date, form.checkInTime),
            checkOutTime:
              form.status === 'leave' || !form.checkOutTime
                ? null
                : combineDateTime(form.date, form.checkOutTime),
            correctionNote: form.correctionNote.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to save');
        toast.success('Attendance updated');
      }
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add Missing Day' : 'Edit Attendance'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `Backfill a missed day for ${userName}.`
              : `Edit ${userName}'s attendance for ${formatDate(form.date)}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              disabled={mode === 'edit'}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, status: v as 'check-in' | 'leave' }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check-in">Present</SelectItem>
                <SelectItem value="leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.status === 'check-in' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Input
                  type="time"
                  value={form.checkInTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, checkInTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input
                  type="time"
                  value={form.checkOutTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, checkOutTime: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Reason / note
              <span className="ml-1 text-xs text-rose-400">*</span>
            </Label>
            <Textarea
              value={form.correctionNote}
              onChange={(e) =>
                setForm((f) => ({ ...f, correctionNote: e.target.value }))
              }
              placeholder="e.g. Member forgot to check in — confirmed present via Slack"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Backfill' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Member Detail Dialog ────────────────────────────────────────────

interface MemberDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MemberDialog({ user, open, onOpenChange }: MemberDialogProps) {
  const { isAdmin } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rangeFrom, setRangeFrom] = useState<string>(firstDayOfMonth());
  const [rangeTo, setRangeTo] = useState<string>(todayStr());

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshHistory = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!user || !open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-open loading flag
    setLoadingHistory(true);
    fetch(`/api/attendance?userId=${user.id}&from=${rangeFrom}&to=${rangeTo}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const sorted = (data.attendance ?? []).sort(
          (a: AttendanceRecord, b: AttendanceRecord) => b.date.localeCompare(a.date),
        );
        setHistory(sorted);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, open, rangeFrom, rangeTo, refreshKey]);

  async function handleDelete(record: AttendanceRecord) {
    if (!confirm(`Delete attendance record for ${formatDate(record.date)}? This cannot be undone.`)) {
      return;
    }
    setDeletingId(record.id);
    try {
      const res = await fetch(`/api/attendance/${record.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete');
      }
      toast.success('Record deleted');
      refreshHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate() {
    setFormMode('create');
    setEditingRecord(null);
    setFormOpen(true);
  }

  function openEdit(record: AttendanceRecord) {
    setFormMode('edit');
    setEditingRecord(record);
    setFormOpen(true);
  }

  if (!user) return null;

  const internProgress =
    user.role === 'intern' && user.internshipStart && user.internshipEnd
      ? getInternProgress(user.internshipStart, user.internshipEnd)
      : null;

  const daysRemaining =
    user.role === 'intern' && user.internshipEnd
      ? getInternDaysRemaining(user.internshipEnd)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Member Details</DialogTitle>
          <DialogDescription>Profile and attendance history.</DialogDescription>
        </DialogHeader>

        {/* Profile Section */}
        <div className="flex items-center gap-4">
          <MoodAvatar mood={user.mood} name={user.name} className="size-14" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold">{user.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {user.email}
            </div>
            {user.birthDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cake className="h-3 w-3" />
                {formatDate(user.birthDate)}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-[10px]', getRoleColor(user.role))}>
                {getRoleLabel(user.role)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  user.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
                )}
              >
                {user.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
              {user.mood && (() => {
                const def = getMood(user.mood);
                return def ? (
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] border-white/10 bg-white/[0.04]', def.text)}
                  >
                    {def.label}
                  </Badge>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Intern Period */}
        {user.role === 'intern' && user.internshipStart && user.internshipEnd && (
          <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Internship Period
              </div>
              <span className="text-muted-foreground">
                {daysRemaining} days remaining
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(user.internshipStart)} — {formatDate(user.internshipEnd)}
            </div>
            <Progress value={internProgress ?? 0}>
              <span className="text-xs text-muted-foreground">{internProgress}%</span>
            </Progress>
          </div>
        )}

        <Separator className="bg-white/[0.06]" />

        {/* Attendance History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attendance History
            </h4>
            {isAdmin && (
              <Button size="xs" variant="outline" onClick={openCreate} className="gap-1">
                <Plus className="h-3 w-3" />
                Add Missing Day
              </Button>
            )}
          </div>

          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">From</Label>
              <Input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="h-8 w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">To</Label>
              <Input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="h-8 w-36"
              />
            </div>
          </div>

          {loadingHistory ? (
            <p className="text-xs text-muted-foreground py-2">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No attendance records in this range.</p>
          ) : (
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-[10px] text-muted-foreground">Date</TableHead>
                    <TableHead className="text-[10px] text-muted-foreground">Times</TableHead>
                    <TableHead className="text-[10px] text-muted-foreground">Status</TableHead>
                    {isAdmin && (
                      <TableHead className="text-[10px] text-muted-foreground text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => {
                    const status = resolveStatus(record);
                    return (
                      <TableRow key={record.id} className="border-white/[0.04]">
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            {formatDate(record.date)}
                            {record.correctedBy && (
                              <PencilLine
                                className="h-3 w-3 text-amber-400"
                                aria-label={
                                  record.correctionNote
                                    ? `Edited by admin: ${record.correctionNote}`
                                    : 'Edited by admin'
                                }
                              >
                                <title>
                                  {record.correctionNote
                                    ? `Edited by admin — ${record.correctionNote}`
                                    : 'Edited by admin'}
                                </title>
                              </PencilLine>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {record.status === 'leave'
                            ? '—'
                            : `${record.checkInTime ? formatTime(String(record.checkInTime)) : '—'} → ${record.checkOutTime ? formatTime(String(record.checkOutTime)) : '—'}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px]', getStatusColor(status))}>
                            {getStatusLabel(status)}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(record)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-rose-400"
                                onClick={() => handleDelete(record)}
                                disabled={deletingId === record.id}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>

      {isAdmin && (
        <AttendanceFormDialog
          key={`${formMode}-${editingRecord?.id ?? 'new'}-${formOpen ? 'o' : 'c'}`}
          open={formOpen}
          onOpenChange={setFormOpen}
          mode={formMode}
          userId={user.id}
          userName={user.name}
          record={editingRecord}
          onSaved={refreshHistory}
        />
      )}
    </Dialog>
  );
}

// ── Members Table Row ───────────────────────────────────────────────

function MemberRow({
  user,
  status,
  isAdmin,
  onView,
  onEdit,
  onToggleStatus,
}: {
  user: User;
  status: AttendanceStatus;
  isAdmin: boolean;
  onView: (u: User) => void;
  onEdit: (u: User) => void;
  onToggleStatus: (uId: string) => void;
}) {
  return (
    <TableRow className="border-white/[0.04] transition-colors hover:bg-white/[0.03]">
      <TableCell>
        <div className="flex items-center gap-3">
          <MoodAvatar mood={user.mood} name={user.name} className="size-7" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px]', getRoleColor(user.role))}>
          {getRoleLabel(user.role)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px]',
            user.status === 'active'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
              : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
          )}
        >
          {user.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px]', getStatusColor(status))}>
          {getStatusLabel(status)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onView(user)}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View</span>
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(user)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleStatus(user.id)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <ToggleLeft className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Main Members Page ───────────────────────────────────────────────

type RoleFilter = 'all' | 'employee' | 'intern' | 'freelancer';

export default function MembersPage() {
  const { users, updateUser, createUser, toggleStatus } = useUsers();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  
  // View Profile Dialog
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);

  // Create/Edit Dialog
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    birthDate: "",
    role: "intern" as UserRole,
    status: "active" as "active" | "inactive",
    internshipStart: "",
    internshipEnd: "",
  });

  useEffect(() => {
    fetch(`/api/attendance?date=${todayStr()}`)
      .then((r) => r.json())
      .then((data) => setTodayAttendance(data.attendance ?? []))
      .catch(() => {});
  }, []);

  const allMembers = useMemo(
    () => users.filter((u) => u.role !== 'admin'),
    [users],
  );

  const filteredMembers = useMemo(() => {
    return allMembers.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allMembers, search, roleFilter]);

  const handleView = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  // Manage functions
  function openCreateDialog() {
    setEditUser(null);
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      birthDate: "",
      role: "intern",
      status: "active",
      internshipStart: "",
      internshipEnd: "",
    });
    setManageDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      password: "",
      birthDate: user.birthDate || "",
      role: user.role,
      status: user.status,
      internshipStart: user.internshipStart || "",
      internshipEnd: user.internshipEnd || "",
    });
    setManageDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.username || !formData.email) {
      toast.error("Name, username and email are required");
      return;
    }
    if (!editUser && !formData.password) {
      toast.error("Password is required when creating a new user");
      return;
    }
    try {
      if (editUser) {
        await updateUser(editUser.id, {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          birthDate: formData.birthDate || undefined,
          role: formData.role,
          status: formData.status,
          internshipStart: formData.internshipStart || undefined,
          internshipEnd: formData.internshipEnd || undefined,
          ...(formData.password ? { password: formData.password } : {}),
        });
        toast.success("User updated successfully");
      } else {
        await createUser({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          status: formData.status,
          birthDate: formData.birthDate || undefined,
          internshipStart: formData.internshipStart || undefined,
          internshipEnd: formData.internshipEnd || undefined,
        });
        toast.success("User created successfully");
      }
      setManageDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save user");
    }
  }

  async function handleToggleStatus(userId: string) {
    try {
      await toggleStatus(userId);
      toast.success("User status updated");
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <Badge variant="secondary" className="text-xs">
            {allMembers.length} members
          </Badge>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Tabs
          value={roleFilter}
          onValueChange={(val) => setRoleFilter(val as RoleFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="employee">Employees</TabsTrigger>
            <TabsTrigger value="intern">Interns</TabsTrigger>
            <TabsTrigger value="freelancer">Freelancers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Data Table ──────────────────────────────────────── */}
      <Card className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] animate-fade-in" style={{ animationDelay: '120ms' }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground pl-5">Member</TableHead>
                <TableHead className="text-xs text-muted-foreground">Role</TableHead>
                <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground">Today</TableHead>
                <TableHead className="text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No members found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((user) => {
                  const record = todayAttendance.find((a) => a.userId === user.id);
                  const status = resolveStatus(record);
                  return (
                    <MemberRow 
                      key={user.id} 
                      user={user} 
                      status={status} 
                      isAdmin={isAdmin}
                      onView={handleView}
                      onEdit={openEditDialog}
                      onToggleStatus={handleToggleStatus}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Detail Dialog ───────────────────────────────────── */}
      <MemberDialog user={selectedUser} open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* ── Create / Edit User Dialog ──────────────────────── */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
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
              <Label>
                Password
                {editUser && (
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (leave blank to keep current)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, password: e.target.value }))
                }
                placeholder={editUser ? "••••••••" : "Set initial password"}
                autoComplete="new-password"
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
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
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
