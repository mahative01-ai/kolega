import {
  Archive,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCorrectionAction } from "./actions";
import { getJakartaDateKey } from "@/lib/attendance-time";
import { CorrectionFormClient } from "./correction-form-client";

export const dynamic = "force-dynamic";

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
  PRESENT: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
  ON_TIME: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50",
  LATE: "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900/50",
  WFH: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
  PERMISSION: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
  SICK: "bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900/50",
  LEAVE: "bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900/50",
  ALPHA: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50",
  HOLIDAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
  OFF_DAY: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
};

const requestStatusLabel: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const requestStatusColor: Record<string, string> = {
  PENDING: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-900/50",
  APPROVED: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900/50",
  REJECTED: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-900/50",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const successMessages: Record<string, string> = {
  created: "Pengajuan koreksi presensi berhasil diajukan dan sedang menunggu persetujuan.",
};

const errorMessages: Record<string, string> = {
  "missing-fields": "Mohon lengkapi semua data formulir.",
  "not-found": "Catatan presensi tidak ditemukan.",
  unauthorized: "Anda tidak berwenang mengoreksi data ini.",
  "already-pending": "Catatan presensi ini sedang dalam proses pengajuan koreksi pending.",
  "out-of-range": "Pengajuan koreksi hanya dapat diajukan untuk kehadiran antara 2 hingga 7 hari yang lalu.",
};

export default async function MemberCorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ recordId?: string; success?: string; error?: string }>;
}) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const params = await searchParams;

  const recordIdParam = params.recordId ?? "";

  // Filter dropdown: only records between 2 to 7 days ago
  const todayKey = getJakartaDateKey(new Date());
  const todayMidnight = new Date(`${todayKey}T00:00:00.000Z`);
  const minDate = new Date(todayMidnight.getTime() - 7 * 24 * 60 * 60 * 1000);
  const maxDate = new Date(todayMidnight.getTime() - 2 * 24 * 60 * 60 * 1000);

  const recentRecords = await prisma.attendanceRecord.findMany({
    where: {
      userId: currentUser.id,
      attendanceDate: {
        gte: minDate,
        lte: maxDate,
      },
    },
    orderBy: { attendanceDate: "desc" },
    select: {
      id: true,
      attendanceDate: true,
      status: true,
    },
  });

  // If recordId param is provided, fetch it
  let preselectedRecord = null;
  if (recordIdParam) {
    preselectedRecord = recentRecords.find((r) => r.id === recordIdParam);
    if (!preselectedRecord) {
      // Fallback: try fetching from DB directly in case it's older than 30 records
      preselectedRecord = await prisma.attendanceRecord.findFirst({
        where: { id: recordIdParam, userId: currentUser.id },
        select: { id: true, attendanceDate: true, status: true },
      });
    }
  }

  // Fetch submitted corrections history
  const corrections = await prisma.attendanceCorrection.findMany({
    where: { requestedById: currentUser.id },
    orderBy: { createdAt: "desc" },
    include: {
      attendanceRecord: {
        select: {
          attendanceDate: true,
        },
      },
      approvedBy: {
        select: { name: true },
      },
    },
  });

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/corrections"
      badge="Koreksi Presensi"
      title="Pengajuan Koreksi Presensi Lampau"
      description="Gunakan modul ini untuk memperbaiki status presensi lampau, misalnya lupa absen masuk/pulang."
    >
      {params.success && successMessages[params.success] ? (
        <div className="rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-400">
          {successMessages[params.success]}
        </div>
      ) : null}

      {params.error && errorMessages[params.error] ? (
        <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {errorMessages[params.error]}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <PlusCircle className="size-5 text-zinc-700 dark:text-zinc-300" />
              Ajukan Koreksi
            </CardTitle>
            <CardDescription>
              Silakan pilih tanggal presensi yang ingin diperbaiki.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CorrectionFormClient
              recentRecords={recentRecords}
              preselectedRecord={preselectedRecord}
              statusLabel={statusLabel}
              statusColor={statusColor}
              action={createCorrectionAction}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-5 text-zinc-700" />
              Riwayat Koreksi
            </CardTitle>
            <CardDescription>
              Daftar perbaikan data kehadiran yang pernah diajukan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal Presensi</TableHead>
                  <TableHead>Status Lama</TableHead>
                  <TableHead>Status Baru</TableHead>
                  <TableHead>Alasan Member</TableHead>
                  <TableHead>Status Pengajuan</TableHead>
                  <TableHead>Pemeriksa (Reviewer)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      Belum ada riwayat pengajuan koreksi presensi.
                    </TableCell>
                  </TableRow>
                ) : (
                  corrections.map((corr) => (
                    <TableRow key={corr.id}>
                      <TableCell className="font-medium">
                        {formatDate(corr.attendanceRecord.attendanceDate)}
                      </TableCell>
                      <TableCell>
                        {corr.previousStatus ? (
                          <Badge variant="secondary" className={statusColor[corr.previousStatus]}>
                            {statusLabel[corr.previousStatus] ?? corr.previousStatus}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {corr.newStatus ? (
                          <Badge variant="secondary" className={statusColor[corr.newStatus]}>
                            {statusLabel[corr.newStatus] ?? corr.newStatus}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={corr.reason}>
                        {corr.reason}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={requestStatusColor[corr.status]}
                        >
                          {requestStatusLabel[corr.status] ?? corr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {corr.approvedBy?.name ?? <span className="text-zinc-400">-</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
