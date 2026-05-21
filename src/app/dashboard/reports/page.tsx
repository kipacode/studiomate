'use client';

import { useState, useMemo } from 'react';
import {
  CalendarDays,
  GraduationCap,
  Download,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  mockUsers,
  mockAttendance,
} from '@/lib/mock-data';
import type { User, Attendance } from '@/lib/types';
import {
  cn,
  formatDate,
  getRoleColor,
  getRoleLabel,
  getInitials,
  getInternProgress,
} from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

// ── Types ───────────────────────────────────────────────────────────

type ReportType = 'attendance' | 'intern';

interface ReportTypeOption {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
  accentClass: string;
  iconBgClass: string;
}

interface AttendanceReportRow {
  user: User;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalHours: number;
}

interface InternReportRow {
  user: User;
  daysPresent: number;
  daysLate: number;
  progress: number;
}

// ── Report type cards ───────────────────────────────────────────────

const reportTypes: ReportTypeOption[] = [
  {
    id: 'attendance',
    title: 'Attendance Report',
    description: 'Attendance summary by date range',
    icon: CalendarDays,
    accentClass: 'text-sky-400',
    iconBgClass: 'bg-sky-500/10',
  },
  {
    id: 'intern',
    title: 'Intern Report',
    description: 'PKL combined attendance + activity',
    icon: GraduationCap,
    accentClass: 'text-amber-400',
    iconBgClass: 'bg-amber-500/10',
  },
];

// ── Helper: compute reports from mock data ──────────────────────────

function getAttendanceReport(userIds: string[], from: string, to: string): AttendanceReportRow[] {
  return userIds.map((userId) => {
    const user = mockUsers.find((u) => u.id === userId)!;
    const records = mockAttendance.filter(
      (r) => r.userId === userId && r.date >= from && r.date <= to,
    );

    const daysPresent = records.filter((r) => r.checkInTime !== null).length;
    const daysLate = records.filter((r) => r.isLate).length;

    // Count weekdays in range
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    let totalWeekdays = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) totalWeekdays++;
      cursor.setDate(cursor.getDate() + 1);
    }
    const daysAbsent = Math.max(0, totalWeekdays - daysPresent);

    // Estimate hours from check-in/out
    let totalHours = 0;
    records.forEach((r) => {
      if (r.checkInTime && r.checkOutTime) {
        const diff = new Date(r.checkOutTime as string | Date).getTime() - new Date(r.checkInTime as string | Date).getTime();
        totalHours += diff / (1000 * 60 * 60);
      }
    });

    return { user, daysPresent, daysAbsent, daysLate, totalHours: Math.round(totalHours * 10) / 10 };
  });
}

function getInternReport(userIds: string[], from: string, to: string): InternReportRow[] {
  return userIds.map((userId) => {
    const user = mockUsers.find((u) => u.id === userId)!;
    const records = mockAttendance.filter(
      (r) => r.userId === userId && r.date >= from && r.date <= to,
    );

    const daysPresent = records.filter((r) => r.checkInTime !== null).length;
    const daysLate = records.filter((r) => r.isLate).length;
    const progress =
      user.internshipStart && user.internshipEnd
        ? getInternProgress(user.internshipStart, user.internshipEnd)
        : 0;

    return { user, daysPresent, daysLate, progress };
  });
}

// ── Main Reports Page ───────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [generated, setGenerated] = useState(false);

  // Users filtered by report type
  const availableUsers = useMemo(() => {
    if (!selectedType) return [];
    if (selectedType === 'intern') {
      return mockUsers.filter((u) => u.role === 'intern' && u.status === 'active');
    }
    return mockUsers.filter((u) => u.role !== 'admin' && u.status === 'active');
  }, [selectedType]);

  // The actual user IDs to generate report for
  const targetUserIds = useMemo(() => {
    if (selectedUserId === 'all') return availableUsers.map((u) => u.id);
    return [selectedUserId];
  }, [selectedUserId, availableUsers]);

  // Generate report data
  const attendanceReport = useMemo(() => {
    if (!generated || selectedType !== 'attendance') return [];
    return getAttendanceReport(targetUserIds, dateFrom, dateTo);
  }, [generated, selectedType, targetUserIds, dateFrom, dateTo]);

  const internReport = useMemo(() => {
    if (!generated || selectedType !== 'intern') return [];
    return getInternReport(targetUserIds, dateFrom, dateTo);
  }, [generated, selectedType, targetUserIds, dateFrom, dateTo]);

  const handleSelectType = (type: ReportType) => {
    setSelectedType(type);
    setGenerated(false);
    setSelectedUserId('all');
  };

  const handleGenerate = () => {
    setGenerated(true);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.info('Export feature coming soon', {
      description: `${format.toUpperCase()} export is under development.`,
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate and export team reports for attendance, activity, and intern performance.
        </p>
      </div>

      {/* ── Report Type Selector ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {reportTypes.map((rt, index) => {
          const Icon = rt.icon;
          const isSelected = selectedType === rt.id;

          return (
            <Card
              key={rt.id}
              onClick={() => handleSelectType(rt.id)}
              className={cn(
                'cursor-pointer rounded-xl border transition-all duration-200 animate-fade-in hover:bg-white/[0.05]',
                isSelected
                  ? 'border-white/[0.15] bg-white/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.03]',
              )}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', rt.iconBgClass)}>
                  <Icon className={cn('h-5 w-5', rt.accentClass)} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">{rt.title}</p>
                  <p className="text-xs text-muted-foreground">{rt.description}</p>
                </div>
                {isSelected && (
                  <div className={cn('ml-auto h-2 w-2 rounded-full animate-pulse-dot', rt.accentClass.replace('text-', 'bg-'))} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Filters & Generate ───────────────────────────────── */}
      {selectedType && (
        <Card className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] animate-fade-in">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setGenerated(false);
                  }}
                  className="w-40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setGenerated(false);
                  }}
                  className="w-40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Member</label>
                <Select
                  value={selectedUserId}
                  onValueChange={(val) => {
                    setSelectedUserId(val || "all");
                    setGenerated(false);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select member" />
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
              <Button onClick={handleGenerate} className="h-8 gap-1.5 sm:ml-auto">
                <FileText className="h-3.5 w-3.5" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Report Results ───────────────────────────────────── */}
      {generated && selectedType === 'attendance' && (
        <ReportResultCard
          title="Attendance Report"
          onExport={handleExport}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Days Present</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Days Absent</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Days Late</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceReport.map((row) => (
                <TableRow key={row.user.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                  <TableCell className="font-medium">{row.user.name}</TableCell>
                  <TableCell className="text-right text-emerald-400">{row.daysPresent}</TableCell>
                  <TableCell className="text-right text-neutral-400">{row.daysAbsent}</TableCell>
                  <TableCell className="text-right text-amber-400">{row.daysLate}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.totalHours}h</TableCell>
                </TableRow>
              ))}
              {attendanceReport.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No attendance data found for the selected range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ReportResultCard>
      )}

      {generated && selectedType === 'intern' && (
        <ReportResultCard
          title="Intern Report"
          onExport={handleExport}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Days Present</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Days Late</TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Progress %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {internReport.map((row) => (
                <TableRow key={row.user.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                  <TableCell className="font-medium">{row.user.name}</TableCell>
                  <TableCell className="text-right text-emerald-400">{row.daysPresent}</TableCell>
                  <TableCell className="text-right text-amber-400">{row.daysLate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{row.progress}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {internReport.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No intern data found for the selected range.
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
  onExport,
  children,
}: {
  title: string;
  onExport: (format: 'csv' | 'pdf') => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
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
