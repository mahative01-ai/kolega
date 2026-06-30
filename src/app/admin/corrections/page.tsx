import {
  Archive,
  CheckCircle2,
  Clock,
  XCircle,
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
import { reviewCorrectionAction } from "./actions";

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
  approve: "Koreksi presensi disetujui. Catatan presensi telah diperbarui secara manual.",
  reject: "Koreksi presensi ditolak.",
};

const errorMessages: Record<string, string> = {
  "invalid-action": "Aksi tidak valid.",
  "not-found": "Pengajuan tidak ditemukan.",
  "already-reviewed": "Pengajuan sudah ditinjau sebelumnya.",
  "unauthorized-studio": "Anda tidak memiliki akses ke studio asal catatan presensi ini.",
};

export default async function AdminCorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const params = await searchParams;

  // Filter requests based on user role (Admin sees their studio, Super Admin sees all)
  const scopedWhere =
    currentUser.role === "SUPER_ADMIN"
      ? {}
      : {
          attendanceRecord: {
            ownerStudioId: currentUser.defaultStudioId ?? "__NO_STUDIO__",
          },
        };

  const corrections = await prisma.attendanceCorrection.findMany({
    where: scopedWhere,
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: {
        select: {
          name: true,
          email: true,
          defaultStudio: { select: { name: true } },
        },
      },
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

  const pendingCorrections = corrections.filter((c) => c.status === "PENDING");
  const reviewedCorrections = corrections.filter((c) => c.status !== "PENDING");

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/admin/corrections"
      badge={currentUser.role === "SUPER_ADMIN" ? "Super Admin Approval" : "Admin Approval"}
      title="Persetujuan Koreksi Presensi Lampau"
      description={
        currentUser.role === "SUPER_ADMIN"
          ? "Tinjau dan setujui pengajuan perbaikan data presensi dari seluruh studio."
          : `Tinjau dan setujui pengajuan perbaikan data presensi member studio ${currentUser.defaultStudio?.name ?? ""}.`
      }
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

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5 text-amber-600" />
              Menunggu Persetujuan ({pendingCorrections.length})
            </CardTitle>
            <CardDescription>
              Daftar permintaan koreksi data presensi yang diajukan oleh member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama / Email</TableHead>
                  <TableHead>Studio</TableHead>
                  <TableHead>Tanggal Presensi</TableHead>
                  <TableHead>Status Lama</TableHead>
                  <TableHead>Status Baru</TableHead>
                  <TableHead>Alasan Koreksi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCorrections.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      Tidak ada pengajuan koreksi presensi pending saat ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingCorrections.map((corr) => (
                    <TableRow key={corr.id}>
                      <TableCell>
                        <div className="font-medium">{corr.requestedBy.name}</div>
                        <div className="text-xs text-zinc-500">{corr.requestedBy.email}</div>
                      </TableCell>
                      <TableCell>{corr.requestedBy.defaultStudio?.name ?? "-"}</TableCell>
                      <TableCell>{formatDate(corr.attendanceRecord.attendanceDate)}</TableCell>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <form action={reviewCorrectionAction} method="POST">
                            <input type="hidden" name="correctionId" value={corr.id} />
                            <input type="hidden" name="action" value="APPROVE" />
                            <Button
                              type="submit"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="size-3 mr-1" />
                              Setujui
                            </Button>
                          </form>
                          <form action={reviewCorrectionAction} method="POST">
                            <input type="hidden" name="correctionId" value={corr.id} />
                            <input type="hidden" name="action" value="REJECT" />
                            <Button
                              type="submit"
                              size="sm"
                              variant="destructive"
                            >
                              <XCircle className="size-3 mr-1" />
                              Tolak
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-5 text-zinc-600" />
              Riwayat Persetujuan Koreksi
            </CardTitle>
            <CardDescription>
              Daftar pengajuan koreksi presensi yang sudah diproses sebelumnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama / Email</TableHead>
                  <TableHead>Studio</TableHead>
                  <TableHead>Tanggal Presensi</TableHead>
                  <TableHead>Status Lama</TableHead>
                  <TableHead>Status Baru</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pemeriksa (Reviewer)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewedCorrections.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      Belum ada riwayat persetujuan koreksi presensi.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviewedCorrections.map((corr) => (
                    <TableRow key={corr.id}>
                      <TableCell>
                        <div className="font-medium">{corr.requestedBy.name}</div>
                        <div className="text-xs text-zinc-500">{corr.requestedBy.email}</div>
                      </TableCell>
                      <TableCell>{corr.requestedBy.defaultStudio?.name ?? "-"}</TableCell>
                      <TableCell>{formatDate(corr.attendanceRecord.attendanceDate)}</TableCell>
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
