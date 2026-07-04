"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  ClipboardCheck,
  Clock3,
  Download,
  HeartPulse,
  Home,
  QrCode,
  ShieldCheck,
  History,
  Camera,
  CalendarDays,
  User,
  Users,
  Settings,
  FolderLock,
  Brush
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPersonalQrCredentialAction } from "@/app/member/presensi/actions";

type Props = {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    defaultStudioId: string | null;
  };
  data: {
    studio: { name: string; address: string | null } | null;
    activeMembers: number;
    summary: {
      total: number;
      sick: number;
      late: number;
      alpha: number;
      wfh: number;
    };
    pendingRequests: number;
    recentAttendance: any[];
    picketToday: any[];
    monthLabel: string;
    selectedMonth: { year: number; monthIndex: number };
    personalSummary: {
      total: number;
      sick: number;
      late: number;
      alpha: number;
      wfh: number;
    };
    personalSchedules: any[];
    qrCredential: { qrUid: string; issuedAt: Date } | null;
    todayRecord: {
      checkInAt: Date | null;
      checkOutAt: Date | null;
      status: string;
      workMode: string;
    } | null;
  };
  qrSvg: string | null;
  days: { date: Date; dateKey: string; dayNumber: number }[];
  leadingBlankDays: number;
  todayKey: string;
  scheduleByDateMap: Record<string, { workMode: string; note: string | null }>;
};

const statusLabel: Record<string, string> = {
  PRESENT: "Hadir",
  ON_TIME: "Tepat Waktu",
  LATE: "Terlambat",
  WFH: "WFH",
  PERMISSION: "Izin",
  SICK: "Sakit",
  LEAVE: "Cuti",
  ALPHA: "Alpha",
  HOLIDAY: "Libur",
  OFF_DAY: "Libur",
};

const statusColor: Record<string, string> = {
  PRESENT: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  ON_TIME: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  LATE: "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900",
  WFH: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900",
  PERMISSION: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  SICK: "bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900",
  LEAVE: "bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900",
  ALPHA: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900",
  HOLIDAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
  OFF_DAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
};

const workModeLabels: Record<string, string> = {
  WFO: "WFO (Kantor)",
  WFH: "WFH (Rumah)",
};

const workModeStyles: Record<string, string> = {
  WFO: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700",
  WFH: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900",
};

function formatTime(date: Date | null | string) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function AdminDashboardClient({
  currentUser,
  data,
  qrSvg,
  days,
  leadingBlankDays,
  todayKey,
  scheduleByDateMap,
}: Props) {
  const [activeTab, setActiveTab] = useState<"personal" | "studio">("personal");

  const personalMetrics = [
    {
      label: `Kehadiran Saya ${data.monthLabel}`,
      value: data.personalSummary.total,
      icon: ClipboardCheck,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `Sakit Saya ${data.monthLabel}`,
      value: data.personalSummary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Terlambat Saya ${data.monthLabel}`,
      value: data.personalSummary.late,
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: `Alpha Saya ${data.monthLabel}`,
      value: data.personalSummary.alpha,
      icon: AlertTriangle,
      color: "text-red-700 dark:text-red-400",
    },
    {
      label: `WFH Saya ${data.monthLabel}`,
      value: data.personalSummary.wfh,
      icon: Home,
      color: "text-sky-700 dark:text-sky-400",
    },
  ];

  const studioMetrics = [
    {
      label: `Kehadiran Tim ${data.monthLabel}`,
      value: data.summary.total,
      icon: ClipboardCheck,
      color: "text-blue-700 dark:text-blue-400",
    },
    {
      label: `Sakit Tim ${data.monthLabel}`,
      value: data.summary.sick,
      icon: HeartPulse,
      color: "text-violet-700 dark:text-violet-400",
    },
    {
      label: `Terlambat Tim ${data.monthLabel}`,
      value: data.summary.late,
      icon: Clock3,
      color: "text-orange-700 dark:text-orange-400",
    },
    {
      label: `Alpha Tim ${data.monthLabel}`,
      value: data.summary.alpha,
      icon: AlertTriangle,
      color: "text-red-700 dark:text-red-400",
    },
    {
      label: `WFH Tim ${data.monthLabel}`,
      value: data.summary.wfh,
      icon: Home,
      color: "text-sky-700 dark:text-sky-400",
    },
  ];

  const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("personal")}
          className={cn(
            "flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors focus:outline-none",
            activeTab === "personal"
              ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          )}
        >
          <User className="size-4" />
          Aktivitas Saya
        </button>
        <button
          onClick={() => setActiveTab("studio")}
          className={cn(
            "flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors focus:outline-none",
            activeTab === "studio"
              ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          )}
        >
          <Users className="size-4" />
          Manajemen Studio ({data.studio?.name ?? "Studio"})
        </button>
      </div>

      {/* ───── TAB 1: PERSONAL VIEW (ACTIVITAS SAYA) ───── */}
      {activeTab === "personal" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Personal Metrics */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {personalMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Icon className={cn("size-4", metric.color)} />
                      {metric.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-semibold", metric.color)}>
                      {metric.value.toLocaleString("id-ID")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* Personal Attendance Status Card */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <Clock3 className="size-5 text-blue-700 dark:text-blue-400" />
                Presensi Pribadi Hari Ini
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                {formatFullDate(new Date())}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-3 shadow-sm">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Check-in</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatTime(data.todayRecord?.checkInAt ?? null)}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-3 shadow-sm">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Check-out</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatTime(data.todayRecord?.checkOutAt ?? null)}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-3 shadow-sm">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Status</p>
                <div className="mt-1">
                  {data.todayRecord ? (
                    <Badge
                      className={cn("text-xs font-semibold px-2 py-0.5 border shadow-none", statusColor[data.todayRecord.status])}
                    >
                      {statusLabel[data.todayRecord.status] ?? data.todayRecord.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-xs px-2 py-0.5 shadow-none">
                      Belum Presensi
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0 flex flex-wrap gap-2">
              <Link
                href="/member/presensi/riwayat"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1.5")}
              >
                <History className="size-4" />
                Lihat Riwayat Presensi Saya
              </Link>
              
              {(!data.todayRecord || !data.todayRecord.checkOutAt) && (
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "flex items-center gap-1.5 bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-900 dark:hover:bg-zinc-200 text-white dark:text-zinc-950"
                  )}
                >
                  <Camera className="size-4" />
                  {data.todayRecord?.checkInAt ? "Scan Check-out WFO" : "Scan Check-in WFO"}
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Calendar & QR Card Grid */}
          <div className="grid gap-6 lg:grid-cols-[0.35fr_0.65fr]">
            {/* QR Card Saya */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                  <QrCode className="size-5 text-zinc-700 dark:text-zinc-400" />
                  QR Card Saya
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Kartu QR Card digital untuk melakukan presensi WFO di HP/Laptop.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.qrCredential ? (
                  <>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                      <div
                        className="mx-auto flex size-44 items-center justify-center [&_svg]:size-40 dark:[&_svg_rect]:fill-zinc-900"
                        dangerouslySetInnerHTML={{ __html: qrSvg ?? "" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">QR UID</p>
                      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1 font-mono text-xs truncate text-zinc-700 dark:text-zinc-300">
                        {data.qrCredential.qrUid}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <a
                        href="/member/presensi/qr-card?format=png"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "w-full flex items-center justify-center gap-1.5"
                        )}
                      >
                        <Download className="size-4" />
                        Unduh PNG
                      </a>
                      <a
                        href="/member/presensi/qr-card?format=jpeg"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "w-full flex items-center justify-center gap-1.5"
                        )}
                      >
                        <Download className="size-4" />
                        Unduh JPEG
                      </a>
                    </div>
                  </>
                ) : (
                  <form action={createPersonalQrCredentialAction}>
                    <Button type="submit" className="w-full">
                      <ShieldCheck className="mr-1.5 size-4" />
                      Aktifkan QR Card
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Kalender Kerja Pribadi */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <CalendarDays className="size-5 text-blue-700 dark:text-blue-400" />
                  Jadwal Kerja Saya
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Kalender jadwal kerja personal Anda bulan ini.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Day header */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-400 mb-2">
                  {dayLabels.map((lbl) => (
                    <div key={lbl} className="py-1">
                      {lbl}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 gap-px rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  {/* Blanks */}
                  {Array.from({ length: leadingBlankDays }).map((_, i) => (
                    <div key={`blank-${i}`} className="min-h-12 bg-zinc-50 dark:bg-zinc-900/40" />
                  ))}

                  {/* Days */}
                  {days.map((day) => {
                    const dateStr = day.dateKey;
                    const schedule = scheduleByDateMap[dateStr];
                    const isToday = dateStr === todayKey;

                    return (
                      <div
                        key={day.dateKey}
                        className={cn(
                          "min-h-12 p-1 bg-white dark:bg-zinc-950 flex flex-col justify-between transition-colors",
                          isToday && "bg-blue-50/30 dark:bg-blue-950/10"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                            isToday
                              ? "bg-blue-700 dark:bg-blue-400 text-white dark:text-zinc-950"
                              : "text-zinc-500 dark:text-zinc-400"
                          )}
                        >
                          {day.dayNumber}
                        </span>

                        {schedule && (
                          <div
                            className={cn(
                              "text-[8px] font-bold px-1 py-0.5 rounded border truncate mt-1 text-center select-none",
                              workModeStyles[schedule.workMode]
                            )}
                            title={schedule.note || workModeLabels[schedule.workMode]}
                          >
                            {schedule.workMode}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ───── TAB 2: STUDIO OPERATIONAL VIEW (MANAJEMEN STUDIO) ───── */}
      {activeTab === "studio" && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Studio Metrics */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {studioMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Icon className={cn("size-4", metric.color)} />
                      {metric.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-semibold", metric.color)}>
                      {metric.value.toLocaleString("id-ID")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* Pending Alerts Card */}
          {data.pendingRequests > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Menunggu Persetujuan Izin</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Ada {data.pendingRequests} pengajuan izin/sakit/cuti yang menunggu verifikasi Anda di studio.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/requests"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-amber-200 dark:border-amber-900 bg-white dark:bg-zinc-950 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50")}
              >
                Lihat Pengajuan
              </Link>
            </div>
          )}

          {/* Picket Duty Info & Quick Actions */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Picket Duty Info */}
            <Card className="md:col-span-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                  <Brush className="size-4 text-blue-700 dark:text-blue-400" />
                  Petugas Piket Studio Hari Ini
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Staf yang bertanggung jawab atas ketertiban studio hari ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {data.picketToday.length === 0 ? (
                  <p className="text-center py-6 text-xs text-zinc-400 dark:text-zinc-500">
                    Belum ada petugas piket yang ditugaskan hari ini.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.picketToday.map((picket) => (
                      <div
                        key={picket.id}
                        className="rounded-full border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 px-3.5 py-1 text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5"
                      >
                        <User className="size-3 text-blue-500" />
                        {picket.user.name}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Aksi Operasional
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                  Kelola staf dan aturan studio.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Link
                  href="/piket"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-start text-xs")}
                >
                  <CalendarDays className="size-3.5 mr-1.5 text-zinc-500" />
                  Atur Penjadwalan Piket
                </Link>
                <Link
                  href="/schedules"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-start text-xs")}
                >
                  <Settings className="size-3.5 mr-1.5 text-zinc-500" />
                  Kelola Jadwal Kerja Tim
                </Link>
                <Link
                  href="/roles"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-start text-xs")}
                >
                  <FolderLock className="size-3.5 mr-1.5 text-zinc-500" />
                  Manajemen Staf & Akses
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent Attendance (Tabel Presensi Tim) */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <CardHeader>
              <CardTitle className="text-base text-zinc-900 dark:text-zinc-50">
                Kehadiran Staf Hari Ini
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400">
                Daftar kehadiran staf studio {data.studio?.name ?? ""} hari ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Lokasi Presensi</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-zinc-500">
                        Belum ada data presensi staf hari ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentAttendance.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div>{item.user.name}</div>
                          <div className="text-xs font-normal text-zinc-500">{item.user.email}</div>
                        </TableCell>
                        <TableCell>{item.locationStudio?.name ?? "Tidak perlu lokasi"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">
                            {item.workMode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColor[item.status]}>
                            {statusLabel[item.status] ?? item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(item.checkInAt)}</TableCell>
                        <TableCell>{formatTime(item.checkOutAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardContent className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <Link
                href="/laporan-presensi"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1.5")}
              >
                <History className="size-4" />
                Lihat Semua Laporan Presensi Tim
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
