'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Eye,
  Mail,
  Calendar,
  Cake,
} from 'lucide-react';
import { useUsers } from '@/lib/users-context';
import type { User } from '@/lib/types';
import {
  cn,
  formatTime,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getRoleColor,
  getRoleLabel,
  getInitials,
  getInternProgress,
  getInternDaysRemaining,
  todayStr,
} from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// ── Types ────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean;
}

type AttendanceStatus = 'checked_in' | 'late' | 'checked_out' | 'not_yet';

function resolveStatus(record?: AttendanceRecord): AttendanceStatus {
  if (!record || !record.checkInTime) return 'not_yet';
  if (record.checkOutTime) return 'checked_out';
  if (record.isLate) return 'late';
  return 'checked_in';
}

// ── Member Detail Dialog ────────────────────────────────────────────

interface MemberDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MemberDialog({ user, open, onOpenChange }: MemberDialogProps) {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    setLoadingHistory(true);
    fetch(`/api/attendance?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data.attendance ?? [])
          .sort((a: AttendanceRecord, b: AttendanceRecord) =>
            b.date.localeCompare(a.date)
          )
          .slice(0, 5);
        setHistory(sorted);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [user, open]);

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Member Details</DialogTitle>
          <DialogDescription>Profile and recent activity overview.</DialogDescription>
        </DialogHeader>

        {/* Profile Section */}
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
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
            <div className="flex items-center gap-2">
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

        {/* Recent Attendance */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Attendance (Last 5 days)
          </h4>
          {loadingHistory ? (
            <p className="text-xs text-muted-foreground py-2">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No attendance records found.</p>
          ) : (
            <div className="space-y-1">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs hover:bg-white/[0.03]"
                >
                  <span className="text-muted-foreground">{formatDate(record.date)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {record.checkInTime ? formatTime(String(record.checkInTime)) : '—'}
                      {' → '}
                      {record.checkOutTime ? formatTime(String(record.checkOutTime)) : '—'}
                    </span>
                    {record.isLate ? (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/20">
                        Late
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                        On Time
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Members Table Row ───────────────────────────────────────────────

function MemberRow({
  user,
  status,
  onView,
}: {
  user: User;
  status: AttendanceStatus;
  onView: (u: User) => void;
}) {
  return (
    <TableRow className="border-white/[0.04] transition-colors hover:bg-white/[0.03]">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
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
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onView(user)}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ── Main Members Page ───────────────────────────────────────────────

type RoleFilter = 'all' | 'employee' | 'intern' | 'freelancer';

export default function MembersPage() {
  const { users } = useUsers();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);

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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
        <Badge variant="secondary" className="text-xs">
          {allMembers.length} members
        </Badge>
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
                    <MemberRow key={user.id} user={user} status={status} onView={handleView} />
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Detail Dialog ───────────────────────────────────── */}
      <MemberDialog user={selectedUser} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
