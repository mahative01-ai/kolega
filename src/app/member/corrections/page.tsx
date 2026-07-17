import {
  Archive,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { createCorrectionAction, cancelCorrectionAction } from "./actions";
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
  LEAVE: "Ganti Hari",
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
  cancelled: "Pengajuan koreksi presensi berhasil dibatalkan.",
};

const errorMessages: Record<string, string> = {
  "missing-fields": "Mohon lengkapi semua data formulir.",
  "missing-checkout": "Koreksi lupa absensi untuk hari yang sudah lewat wajib menyertakan jam masuk dan jam pulang.",
  "not-found": "Catatan presensi tidak ditemukan.",
  unauthorized: "Anda tidak berwenang mengoreksi data ini.",
  "already-pending": "Catatan presensi ini sedang dalam proses pengajuan koreksi pending.",
  "out-of-range": "Pengajuan koreksi hanya dapat diajukan untuk kehadiran antara hari ini hingga 7 hari yang lalu.",
  "already-processed": "Pengajuan tidak dapat dibatalkan karena sudah ditinjau oleh Admin.",
};

export default async function MemberCorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ recordId?: string; success?: string; error?: string }>;
}) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const params = await searchParams;
  const recordIdParam = params.recordId ?? "";
  const loadErrors: string[] = [];

  const todayKey = getJakartaDateKey(new Date());
  const todayMidnight = new Date(`${todayKey}T00:00:00.000Z`);
  const minDate = new Date(todayMidnight.getTime() - 7 * 24 * 60 * 60 * 1000);
  const maxDate = todayMidnight;

  let recentRecords: Array<{
    id: string;
    attendanceDate: Date;
    status: string;
  }> = [];

  try {
    recentRecords = await prisma.attendanceRecord.findMany({
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
  } catch (error) {
    console.error("Failed to load correction attendance records", error);
    loadErrors.push("Catatan presensi terbaru belum bisa dimuat.");
  }

  // If recordId param is provided, fetch it
  let preselectedRecord: {
    id: string;
    attendanceDate: Date;
    status: string;
  } | null = null;
  if (recordIdParam) {
    preselectedRecord = recentRecords.find((r) => r.id === recordIdParam) ?? null;
    if (!preselectedRecord) {
      // Fallback: try fetching from DB directly in case it's older than 30 records
      try {
        preselectedRecord = await prisma.attendanceRecord.findFirst({
          where: { id: recordIdParam, userId: currentUser.id },
          select: { id: true, attendanceDate: true, status: true },
        });
      } catch (error) {
        console.error("Failed to load preselected correction record", error);
        loadErrors.push("Catatan presensi yang dipilih belum bisa dimuat.");
      }
    }
  }

  // Fetch submitted corrections history. Attendance records are loaded separately
  // so the page still renders if an old correction points to a missing record.
  let corrections: Array<{
    id: string;
    attendanceRecordId: string;
    previousStatus: string | null;
    newStatus: string | null;
    reason: string;
    status: string;
    approvedBy: { name: string } | null;
    attendanceRecord: { id: string; attendanceDate: Date } | null;
  }> = [];

  try {
    const correctionRows = await prisma.attendanceCorrection.findMany({
      where: { requestedById: currentUser.id },
      orderBy: { createdAt: "desc" },
      include: {
        approvedBy: {
          select: { name: true },
        },
      },
    });
    const correctionRecordIds = [...new Set(correctionRows.map((corr) => corr.attendanceRecordId))];
    const correctionRecords = correctionRecordIds.length
      ? await prisma.attendanceRecord.findMany({
          where: {
            id: { in: correctionRecordIds },
            userId: currentUser.id,
          },
          select: {
            id: true,
            attendanceDate: true,
          },
        })
      : [];
    const correctionRecordMap = new Map(
      correctionRecords.map((record) => [record.id, record])
    );
    corrections = correctionRows.map((corr) => ({
      ...corr,
      attendanceRecord: correctionRecordMap.get(corr.attendanceRecordId) ?? null,
    }));
  } catch (error) {
    console.error("Failed to load correction history", error);
    loadErrors.push("Riwayat koreksi belum bisa dimuat.");
  }

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

      {loadErrors.length > 0 ? (
        <div className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {loadErrors.join(" ")} Silakan reload halaman atau coba lagi beberapa saat.
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      Belum ada riwayat pengajuan koreksi presensi.
                    </TableCell>
                  </TableRow>
                ) : (
                  corrections.map((corr) => (
                    <TableRow key={corr.id}>
                      <TableCell className="font-medium">
                        {corr.attendanceRecord
                          ? formatDate(corr.attendanceRecord.attendanceDate)
                          : "-"}
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
                      <TableCell className="text-right">
                        {corr.status === "PENDING" ? (
                          <form action={cancelCorrectionAction} method="POST">
                            <input type="hidden" name="correctionId" value={corr.id} />
                            <Button type="submit" size="sm" variant="ghost" className="text-red-650 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 px-2">
                              <Trash2 className="size-4 mr-1" />
                              Batal
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
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
