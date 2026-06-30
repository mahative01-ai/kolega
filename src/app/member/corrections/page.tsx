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
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCorrectionAction } from "./actions";

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
  PRESENT: "bg-emerald-100 text-emerald-800",
  ON_TIME: "bg-emerald-100 text-emerald-800",
  LATE: "bg-orange-100 text-orange-800",
  WFH: "bg-blue-100 text-blue-800",
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  LEAVE: "bg-sky-100 text-sky-800",
  ALPHA: "bg-red-100 text-red-800",
  HOLIDAY: "bg-zinc-200 text-zinc-700",
  OFF_DAY: "bg-zinc-200 text-zinc-700",
};

const requestStatusLabel: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const requestStatusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
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
};

export default async function MemberCorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ recordId?: string; success?: string; error?: string }>;
}) {
  const currentUser = await requireRole("MEMBER");
  const params = await searchParams;

  const recordIdParam = params.recordId ?? "";

  // Fetch recent records for dropdown selection (e.g. past 30 days)
  const recentRecords = await prisma.attendanceRecord.findMany({
    where: { userId: currentUser.id },
    take: 30,
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
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessages[params.success]}
        </div>
      ) : null}

      {params.error && errorMessages[params.error] ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessages[params.error]}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="size-5 text-zinc-700" />
              Ajukan Koreksi
            </CardTitle>
            <CardDescription>
              Silakan pilih tanggal presensi yang ingin diperbaiki.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCorrectionAction} method="POST" className="grid gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="record-select" className="text-sm font-medium">
                  Pilih Catatan Presensi / Tanggal <span className="text-red-500">*</span>
                </label>
                {preselectedRecord ? (
                  <>
                    <input type="hidden" name="recordId" value={preselectedRecord.id} />
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium flex justify-between items-center">
                      <span>{formatDate(preselectedRecord.attendanceDate)}</span>
                      <Badge variant="secondary" className={statusColor[preselectedRecord.status]}>
                        {statusLabel[preselectedRecord.status] ?? preselectedRecord.status}
                      </Badge>
                    </div>
                    <Link
                      href="/member/corrections"
                      className="text-xs text-blue-600 hover:underline mt-1 self-start"
                    >
                      Batal pilih & cari tanggal lain
                    </Link>
                  </>
                ) : (
                  <select
                    id="record-select"
                    name="recordId"
                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                    required
                  >
                    <option value="">-- Pilih Tanggal --</option>
                    {recentRecords.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatDate(r.attendanceDate)} ({statusLabel[r.status] ?? r.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-status" className="text-sm font-medium">
                  Usulan Status Baru <span className="text-red-500">*</span>
                </label>
                <select
                  id="new-status"
                  name="newStatus"
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  required
                >
                  <option value="ON_TIME">Tepat Waktu (WFO)</option>
                  <option value="LATE">Terlambat (WFO)</option>
                  <option value="WFH">WFH (Penuh)</option>
                  <option value="PERMISSION">Izin</option>
                  <option value="SICK">Sakit</option>
                  <option value="LEAVE">Cuti</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reason" className="text-sm font-medium">
                  Alasan Koreksi <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Contoh: Lupa scan QR saat check-in pagi karena buru-buru, namun saya hadir tepat waktu..."
                  required
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full mt-2">
                <PlusCircle className="size-4 mr-2" />
                Kirim Koreksi
              </Button>
            </form>
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
