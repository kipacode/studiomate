'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import type { User, UserRole } from '@/lib/types';
import { isPresentStatus, isExcusedStatus } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RoleFilter = 'all' | Extract<UserRole, 'employee' | 'intern' | 'freelancer'>;

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'employee', label: 'Employee' },
  { value: 'intern', label: 'Intern' },
  { value: 'freelancer', label: 'Freelancer' },
];

const ROLE_LABEL: Record<Exclude<RoleFilter, 'all'>, string> = {
  employee: 'Employee',
  intern: 'Intern',
  freelancer: 'Freelancer',
};

// ── Types ───────────────────────────────────────────────────────────

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

interface AttendanceReportRow {
  user: User;
  actualWorkdays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  daysLeave: number;
  surplus: number; // present - actualWorkdays (positive = bonus, negative = deficit)
  corrections: number; // # of records admin manually edited or backfilled
}

// ── Helper: compute report from real attendance data ────────────────

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Count required work days in [fromStr, toStr], excluding admin days off.
// Use local-tz date strings so the daysOff lookup matches the stored YYYY-MM-DD.
function countWorkdays(
  fromStr: string,
  toStr: string,
  workDays: number[],
  daysOffDates: Set<string>
): number {
  const end = new Date(`${toStr}T00:00:00`);
  let n = 0;
  const cursor = new Date(`${fromStr}T00:00:00`);
  while (cursor <= end) {
    const dateStr = localDateString(cursor);
    if (workDays.includes(cursor.getDay()) && !daysOffDates.has(dateStr)) n++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return n;
}

// Returns the effective start date for a user's attendance period.
// internshipStart (when set) is a HARD floor — workdays and records before it
// are completely excluded from the report regardless of backfilled data.
// For users without an explicit start, createdAt is used but is softened by
// the earliest attendance record so backfilled staff aren't penalised.
function effectiveStartDate(user: User, earliestRecordDate: string | null): string {
  if (user.internshipStart) return user.internshipStart;
  const joinAnchor = localDateString(new Date(user.createdAt));
  if (earliestRecordDate && earliestRecordDate < joinAnchor) return earliestRecordDate;
  return joinAnchor;
}

function computeReport(
  users: User[],
  attendance: AttendanceRecord[],
  workDays: number[], // required days e.g. [2,3,4,5,6]
  optionalWorkDays: number[], // off-days that count as present when worked, e.g. [0,1] (Sun + Mon)
  daysOffDates: Set<string>, // YYYY-MM-DD dates marked as admin days off (holidays/closures)
  from: string,
  to: string
): AttendanceReportRow[] {
  return users.map((user) => {
    const records = attendance.filter(
      (r) => r.userId === user.id && r.date >= from && r.date <= to
    );

    // Clamp the workday count to the member's effective start so days before they
    // joined aren't counted as absences.
    const earliestRecordDate = records.length
      ? records.reduce((min, r) => (r.date < min ? r.date : min), records[0].date)
      : null;
    const start = effectiveStartDate(user, earliestRecordDate);
    const clampedFrom = start > from ? start : from;
    const actualWorkdays = countWorkdays(clampedFrom, to, workDays, daysOffDates);

    // Only process attendance records from the effective start onwards.
    // Records before internshipStart (or createdAt) are silently excluded so
    // backfilled data doesn't inflate present/leave counts.
    const effectiveRecords = records.filter((r) => r.date >= clampedFrom);

    let requiredPresent = 0; // check-ins on required workdays
    let offDayBonus = 0;     // any record on an off-day (weekly or admin-set) counts as present
    let daysLate = 0;
    let daysLeave = 0;       // leave filed on required workdays only

    for (const r of effectiveRecords) {
      // Parse YYYY-MM-DD as local date to get the correct day-of-week
      const [y, m, d] = r.date.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const isAdminOff = daysOffDates.has(r.date);
      const isWeeklyOff = optionalWorkDays.includes(dow);
      const isOffDay = isAdminOff || isWeeklyOff;
      const isRequired = workDays.includes(dow) && !isAdminOff;

      if (isOffDay) {
        // Only actual attendance on an off-day counts as present surplus.
        if (isPresentStatus(r.status) && r.checkInTime !== null) {
          offDayBonus++;
          if (r.isLate) daysLate++;
        }
      } else if (isRequired) {
        if (isExcusedStatus(r.status)) {
          // izin / sakit — excused, not a worked day.
          daysLeave++;
        } else if (isPresentStatus(r.status)) {
          // check-in (real attendance) or comp_off (substitutes a missed day → present).
          // comp_off has no check-in time, so don't gate this on checkInTime.
          requiredPresent++;
          if (r.isLate) daysLate++;
        }
        // alpha (unexcused) falls through → counted in daysAbsent.
      }
      // Records on fully non-working days (neither required nor off-day) are ignored.
    }

    const daysPresent = requiredPresent + offDayBonus;
    // Absent = unexcused misses only (alpha + no-show). Excused days (izin / sakit)
    // are reported under Leave and must not also count here.
    const daysAbsent = Math.max(0, actualWorkdays - requiredPresent - daysLeave);
    // Surplus = net relative to required workdays. Positive = bonus; negative = deficit.
    const surplus = daysPresent - actualWorkdays;
    const corrections = effectiveRecords.filter((r) => r.correctedBy).length;

    return {
      user,
      actualWorkdays,
      daysPresent,
      daysAbsent,
      daysLate,
      daysLeave,
      surplus,
      corrections,
    };
  });
}

// ── Main Reports Page ───────────────────────────────────────────────

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real data from API
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [workDays, setWorkDays] = useState<number[]>([2, 3, 4, 5, 6]);
  const [optionalWorkDays, setOptionalWorkDays] = useState<number[]>([0, 1]);
  const [daysOffDates, setDaysOffDates] = useState<Set<string>>(new Set());

  // Fetch users & workday settings on mount
  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setAllUsers(data.users);
      })
      .catch(() => toast.error('Failed to load users'));

    fetch('/api/settings/workday')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.workDays) {
          setWorkDays(
            data.settings.workDays
              .split(',')
              .filter(Boolean)
              .map(Number)
          );
        }
        if (typeof data.settings?.optionalWorkDays === 'string') {
          setOptionalWorkDays(
            data.settings.optionalWorkDays
              .split(',')
              .filter(Boolean)
              .map(Number)
          );
        }
      })
      .catch(() => {
        /* use defaults */
      });
  }, []);

  // Available members (excluding admins, only active), narrowed by role filter
  const availableUsers = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.role !== 'admin' &&
          u.status === 'active' &&
          (roleFilter === 'all' ? true : u.role === roleFilter)
      ),
    [allUsers, roleFilter]
  );

  // The actual user IDs to generate report for
  const targetUsers = useMemo(() => {
    if (selectedUserId === 'all') return availableUsers;
    const found = availableUsers.find((u) => u.id === selectedUserId);
    return found ? [found] : [];
  }, [selectedUserId, availableUsers]);

  // Generate report data
  const attendanceReport = useMemo(() => {
    if (!generated || allAttendance.length === 0) return [];
    return computeReport(
      targetUsers,
      allAttendance,
      workDays,
      optionalWorkDays,
      daysOffDates,
      dateFrom,
      dateTo,
    );
  }, [generated, targetUsers, allAttendance, workDays, optionalWorkDays, daysOffDates, dateFrom, dateTo]);

  const isIndividual = selectedUserId !== 'all';
  const selectedUserName = isIndividual
    ? availableUsers.find((u) => u.id === selectedUserId)?.name ?? null
    : null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Fetch attendance and days off in parallel
      const [attRes, daysOffRes] = await Promise.all([
        fetch(`/api/attendance?withUser=true`),
        fetch('/api/settings/days-off'),
      ]);

      const attData = await attRes.json();
      const daysOffData = await daysOffRes.json();

      if (attRes.ok && attData.attendance) {
        setAllAttendance(attData.attendance);
      } else {
        toast.error('Failed to fetch attendance data');
        return;
      }

      if (daysOffRes.ok && daysOffData.daysOff) {
        const dateSet = new Set<string>(daysOffData.daysOff.map((d: any) => d.date));
        setDaysOffDates(dateSet);
      }

      setGenerated(true);
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const headers = ['Name', 'Role', 'Workdays', 'Present', 'Absent', 'Late', 'Leave', 'Surplus/Minus', 'Corrections'];
      const rows = attendanceReport.map((row) => [
        `"${row.user.name}"`,
        row.user.role,
        row.actualWorkdays,
        row.daysPresent,
        row.daysAbsent,
        row.daysLate,
        row.daysLeave,
        row.surplus >= 0 ? `+${row.surplus}` : row.surplus,
        row.corrections,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } else {
      toast.info('PDF export coming soon');
    }
  };

  // Summary stats
  const totals = useMemo(() => {
    if (attendanceReport.length === 0) return null;
    return {
      present: attendanceReport.reduce((s, r) => s + r.daysPresent, 0),
      absent: attendanceReport.reduce((s, r) => s + r.daysAbsent, 0),
      late: attendanceReport.reduce((s, r) => s + r.daysLate, 0),
      leave: attendanceReport.reduce((s, r) => s + r.daysLeave, 0),
      surplus: attendanceReport.reduce((s, r) => s + r.surplus, 0),
      corrections: attendanceReport.reduce((s, r) => s + r.corrections, 0),
    };
  }, [attendanceReport]);

  // Actual workdays (same for all users)
  const actualWorkdays = attendanceReport.length > 0 ? attendanceReport[0].actualWorkdays : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Attendance Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate and export team or individual attendance reports.
        </p>
      </div>

      {/* ── Filters & Generate ───────────────────────────────── */}
      <Card className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] animate-fade-in">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            {/* From date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setGenerated(false);
                }}
                className="h-9 w-40"
              />
            </div>

            {/* To date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setGenerated(false);
                }}
                className="h-9 w-40"
              />
            </div>

            {/* Role filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter((val || 'all') as RoleFilter);
                  setSelectedUserId('all');
                  setGenerated(false);
                }}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Member</label>
              <Select
                value={selectedUserId}
                onValueChange={(val) => {
                  setSelectedUserId(val || 'all');
                  setGenerated(false);
                }}
              >
                <SelectTrigger className="h-9 w-52">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate button — sits at bottom of the row via items-end on parent */}
            <div className="flex flex-col gap-1.5 ml-auto">
              <div className="h-[18px]" aria-hidden />
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="h-9 gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                {loading ? 'Loading…' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Report Results ───────────────────────────────────── */}
      {generated && (
        <ReportResultCard
          title={
            isIndividual
              ? `Attendance Report — ${selectedUserName ?? ''}`
              : `Attendance Report — ${
                  roleFilter === 'all' ? 'All Members' : `All ${ROLE_LABEL[roleFilter]}s`
                }`
          }
          subtitle={`${dateFrom} to ${dateTo} · ${actualWorkdays} required workdays`}
          onExport={handleExport}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs text-muted-foreground">Role</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Present</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Absent</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Late</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Leave</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Surplus/Minus</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Corrections</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceReport.map((row) => (
                <TableRow key={row.user.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {row.user.name}
                      {row.corrections > 0 && (
                        <Pencil
                          className="h-3 w-3 text-amber-400"
                          aria-label="Includes admin-edited entries"
                        >
                          <title>{`${row.corrections} admin-edited ${row.corrections === 1 ? 'entry' : 'entries'}`}</title>
                        </Pencil>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{row.user.role}</TableCell>
                  <TableCell className="text-right text-emerald-400">{row.daysPresent}</TableCell>
                  <TableCell className="text-right text-rose-400">{row.daysAbsent}</TableCell>
                  <TableCell className="text-right text-amber-400">{row.daysLate}</TableCell>
                  <TableCell className="text-right text-indigo-400">{row.daysLeave}</TableCell>
                  <TableCell className={`text-right font-semibold ${
                    row.surplus > 0 ? 'text-emerald-400' : row.surplus < 0 ? 'text-rose-400' : 'text-muted-foreground'
                  }`}>
                    {row.surplus > 0 ? `+${row.surplus}` : row.surplus}
                  </TableCell>
                  <TableCell className={`text-right ${row.corrections > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {row.corrections}
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals row */}
              {totals && attendanceReport.length > 1 && (
                <TableRow className="border-white/[0.08] bg-white/[0.02] font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right text-emerald-400">{totals.present}</TableCell>
                  <TableCell className="text-right text-rose-400">{totals.absent}</TableCell>
                  <TableCell className="text-right text-amber-400">{totals.late}</TableCell>
                  <TableCell className="text-right text-indigo-400">{totals.leave}</TableCell>
                  <TableCell className={`text-right font-semibold ${
                    totals.surplus > 0 ? 'text-emerald-400' : totals.surplus < 0 ? 'text-rose-400' : 'text-muted-foreground'
                  }`}>
                    {totals.surplus > 0 ? `+${totals.surplus}` : totals.surplus}
                  </TableCell>
                  <TableCell className={`text-right ${totals.corrections > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {totals.corrections}
                  </TableCell>
                </TableRow>
              )}

              {attendanceReport.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    No attendance data found for the selected range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ReportResultCard>
      )}
    </div>
  );
}

// ── Report Result Wrapper Card ──────────────────────────────────────

function ReportResultCard({
  title,
  subtitle,
  onExport,
  children,
}: {
  title: string;
  subtitle?: string;
  onExport: (format: 'csv' | 'pdf') => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onExport('csv')}>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onExport('pdf')}>
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">{children}</CardContent>
    </Card>
  );
}
