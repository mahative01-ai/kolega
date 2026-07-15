import {
  CheckCircle2,
  ClipboardList,
  Paperclip,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewRequestAction, deleteRequestAction } from "./actions";
import { reviewCorrectionAction, deleteCorrectionAction } from "../corrections/actions";
import { ConfettiTrigger } from "@/components/confetti-trigger";

export const dynamic = "force-dynamic";

const requestTypeLabel: Record<string, string> = {
  PERMISSION: "Izin",
  SICK: "Sakit",
  LEAVE: "Cuti Legacy",
  WFH: "WFH",
};

const requestTypeColor: Record<string, string> = {
  PERMISSION: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  SICK: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  LEAVE: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  WFH: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
};

const requestStatusLabel: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
};

const requestStatusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  REJECTED: "bg-red-100 text-red-800 border-red-250 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
  CANCELLED: "bg-zinc-100 text-zinc-800 border-zinc-250 dark:bg-zinc-900/50 dark:text-zinc-300 dark:border-zinc-800",
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
  PRESENT: "bg-emerald-100 text-emerald-800",
  ON_TIME: "bg-emerald-100 text-emerald-800",
  LATE: "bg-orange-100 text-orange-800",
  WFH: "bg-blue-100 text-blue-800",
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  LEAVE: "bg-sky-100 text-sky-800",
  ALPHA: "bg-red-100 text-red-800",
  HOLIDAY: "bg-zinc-200 text-zinc-700",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTime(date: Date | string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

const successMessages: Record<string, string> = {
  approve: "Aksi persetujuan berhasil diproses.",
  reject: "Aksi penolakan berhasil diproses.",
  deleted: "Data pengajuan/koreksi berhasil dihapus dan efek kehadirannya telah dipulihkan.",
};

const errorMessages: Record<string, string> = {
  "invalid-action": "Aksi tidak valid.",
  "not-found": "Pengajuan tidak ditemukan.",
  "already-reviewed": "Pengajuan sudah ditinjau sebelumnya.",
  "unauthorized-studio": "Anda tidak memiliki akses ke studio asal.",
  "unauthorized-admin-review": "Persetujuan untuk akun Admin wajib dilakukan oleh Super Admin.",
};

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; tab?: string }>;
}) {
  const currentUser = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const params = await searchParams;

  const scopedWhereRequests: Prisma.RequestWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { status: "PENDING", type: { in: ["PERMISSION", "SICK", "LEAVE", "WFH"] } }
      : {
          status: "PENDING",
          type: { in: ["PERMISSION", "SICK", "LEAVE", "WFH"] },
          user: {
            defaultStudioId: currentUser.defaultStudioId,
            role: {
              notIn: ["ADMIN", "SUPER_ADMIN"],
            },
          },
        };

  const scopedWhereCorrections: Prisma.AttendanceCorrectionWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { status: "PENDING" }
      : {
          status: "PENDING",
          attendanceRecord: {
            ownerStudioId: currentUser.defaultStudioId ?? "__NO_STUDIO__",
            user: {
              role: {
                notIn: ["ADMIN", "SUPER_ADMIN"],
              },
            },
          },
        };

  const scopedWhereHistoryRequests: Prisma.RequestWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { status: { in: ["APPROVED", "REJECTED", "CANCELLED"] }, type: { in: ["PERMISSION", "SICK", "LEAVE", "WFH"] } }
      : {
          status: { in: ["APPROVED", "REJECTED", "CANCELLED"] },
          type: { in: ["PERMISSION", "SICK", "LEAVE", "WFH"] },
          user: {
            defaultStudioId: currentUser.defaultStudioId,
            role: {
              notIn: ["ADMIN", "SUPER_ADMIN"],
            },
          },
        };

  const scopedWhereHistoryCorrections: Prisma.AttendanceCorrectionWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { status: { in: ["APPROVED", "REJECTED"] } }
      : {
          status: { in: ["APPROVED", "REJECTED"] },
          attendanceRecord: {
            ownerStudioId: currentUser.defaultStudioId ?? "__NO_STUDIO__",
            user: {
              role: {
                notIn: ["ADMIN", "SUPER_ADMIN"],
              },
            },
          },
        };

  const [requests, corrections, historyRequests, historyCorrections] = await Promise.all([
    prisma.request.findMany({
      where: scopedWhereRequests,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            defaultStudio: { select: { name: true } },
          },
        },
        reviewer: {
          select: { name: true },
        },
      },
    }),
    prisma.attendanceCorrection.findMany({
      where: scopedWhereCorrections,
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
    }),
    prisma.request.findMany({
      where: scopedWhereHistoryRequests,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            defaultStudio: { select: { name: true } },
          },
        },
        reviewer: {
          select: { name: true },
        },
      },
    }),
    prisma.attendanceCorrection.findMany({
      where: scopedWhereHistoryCorrections,
      orderBy: { updatedAt: "desc" },
      take: 50,
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
    }),
  ]);

  const pendingRequests = requests;
  const pendingCorrections = corrections;

  const defaultTab = params.tab || "requests";

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/admin/requests"
      badge={currentUser.role === "SUPER_ADMIN" ? "Super Admin Approval" : "Admin Approval"}
      title="Persetujuan & Approval"
      description={
        currentUser.role === "SUPER_ADMIN"
          ? "Kelola perizinan member dan permintaan koreksi presensi dari seluruh studio."
          : `Kelola perizinan member dan permintaan koreksi presensi untuk studio ${currentUser.defaultStudio?.name ?? ""}.`
      }
    >
      {params.success && successMessages[params.success] ? (
        <>
          {params.success === "approve" && <ConfettiTrigger />}
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {successMessages[params.success]}
          </div>
        </>
      ) : null}

      {params.error && errorMessages[params.error] ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {errorMessages[params.error]}
        </div>
      ) : null}

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="requests" className="flex items-center gap-1.5">
            <MessageSquare className="size-4" />
            Approval Izin ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="corrections" className="flex items-center gap-1.5">
            <Clock className="size-4" />
            Approval Koreksi ({pendingCorrections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-5 text-amber-600" />
                Menunggu Persetujuan Izin ({pendingRequests.length})
              </CardTitle>
              <CardDescription>
                Daftar izin/ganti hari, sakit, dan WFH baru yang diajukan oleh member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama / Email</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Mulai</TableHead>
                    <TableHead>Selesai</TableHead>
                    <TableHead>Ganti Hari</TableHead>
                    <TableHead>Alasan / Catatan</TableHead>
                    <TableHead>Lampiran</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        Tidak ada pengajuan perizinan yang membutuhkan tindakan Anda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-medium">{req.user.name}</div>
                          <div className="text-xs text-zinc-500">{req.user.email}</div>
                        </TableCell>
                        <TableCell>{req.user.defaultStudio?.name ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={requestTypeColor[req.type]}
                          >
                            {requestTypeLabel[req.type] ?? req.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(req.startDate)}</TableCell>
                        <TableCell>{formatDate(req.endDate)}</TableCell>
                        <TableCell>{req.replacementDate ? formatDate(req.replacementDate) : "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <Dialog>
                            <DialogTrigger asChild>
                              <span className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-medium" title="Klik untuk detail alasan">
                                {req.reason}
                              </span>
                            </DialogTrigger>
                            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                              <DialogHeader>
                                <DialogTitle>Detail Alasan Izin</DialogTitle>
                                <DialogDescription>
                                  Diajukan oleh {req.user.name} ({req.user.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tipe Pengajuan</p>
                                    <p className="mt-1 font-semibold">{requestTypeLabel[req.type] ?? req.type}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Studio Asal</p>
                                    <p className="mt-1">{req.user.defaultStudio?.name ?? "-"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Periode Absen</p>
                                  <p className="mt-1 font-medium">{formatDate(req.startDate)} s.d. {formatDate(req.endDate)}</p>
                                </div>
                                {req.replacementDate && (
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tanggal Ganti Hari</p>
                                    <p className="mt-1">{formatDate(req.replacementDate)}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Alasan Lengkap</p>
                                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-850 dark:text-zinc-200">{req.reason}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell>
                          {req.attachmentUrl ? (
                            <a
                              href={req.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <Paperclip className="size-3" />
                              Lihat File
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <form action={reviewRequestAction} method="POST">
                              <input type="hidden" name="requestId" value={req.id} />
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
                            <form action={reviewRequestAction} method="POST">
                              <input type="hidden" name="requestId" value={req.id} />
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Clock className="size-5 text-zinc-500" />
                Riwayat Persetujuan Perizinan (50 Terakhir)
              </CardTitle>
              <CardDescription>
                Daftar perizinan yang telah disetujui, ditolak, atau dibatalkan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama / Email</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Mulai</TableHead>
                    <TableHead>Selesai</TableHead>
                    <TableHead>Alasan / Catatan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ditinjau Oleh</TableHead>
                    {currentUser.role === "SUPER_ADMIN" && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={currentUser.role === "SUPER_ADMIN" ? 9 : 8}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        Tidak ada riwayat perizinan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-medium text-xs">{req.user.name}</div>
                          <div className="text-[10px] text-zinc-500">{req.user.email}</div>
                        </TableCell>
                        <TableCell className="text-xs">{req.user.defaultStudio?.name ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${requestTypeColor[req.type]}`}
                          >
                            {requestTypeLabel[req.type] ?? req.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(req.startDate)}</TableCell>
                        <TableCell className="text-xs">{formatDate(req.endDate)}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">
                          <Dialog>
                            <DialogTrigger asChild>
                              <span className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-medium">
                                {req.reason}
                              </span>
                            </DialogTrigger>
                            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                              <DialogHeader>
                                <DialogTitle>Detail Alasan Izin (Riwayat)</DialogTitle>
                                <DialogDescription>
                                  Diajukan oleh {req.user.name} ({req.user.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tipe Pengajuan</p>
                                    <p className="mt-1 font-semibold">{requestTypeLabel[req.type] ?? req.type}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Studio Asal</p>
                                    <p className="mt-1">{req.user.defaultStudio?.name ?? "-"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Periode Absen</p>
                                  <p className="mt-1 font-medium">{formatDate(req.startDate)} s.d. {formatDate(req.endDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Alasan Lengkap</p>
                                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-850 dark:text-zinc-200">{req.reason}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Status Pengajuan</p>
                                  <Badge className={`mt-1 ${requestStatusColor[req.status]}`}>
                                    {requestStatusLabel[req.status] ?? req.status}
                                  </Badge>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${requestStatusColor[req.status]}`}>
                            {requestStatusLabel[req.status] ?? req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500">
                          {req.reviewer?.name ?? "-"}
                        </TableCell>
                        {currentUser.role === "SUPER_ADMIN" && (
                          <TableCell className="text-right">
                            <form action={deleteRequestAction} method="POST" onSubmit={(e) => {
                              if (!confirm("Apakah Anda yakin ingin menghapus pengajuan ini secara permanen dan memulihkan efek kehadirannya?")) {
                                e.preventDefault();
                              }
                            }}>
                              <input type="hidden" name="requestId" value={req.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-2"
                              >
                                Hapus
                              </Button>
                            </form>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="corrections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-5 text-amber-600" />
                Menunggu Persetujuan Koreksi ({pendingCorrections.length})
              </CardTitle>
              <CardDescription>
                Daftar permintaan koreksi data presensi lampau yang diajukan oleh member.
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
                          <Badge variant="outline" className={corr.previousStatus ? statusColor[corr.previousStatus] : ""}>
                            {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={corr.newStatus ? statusColor[corr.newStatus] : ""}>
                            {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <Dialog>
                            <DialogTrigger asChild>
                              <span className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-medium" title="Klik untuk detail alasan">
                                {corr.reason}
                              </span>
                            </DialogTrigger>
                            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                              <DialogHeader>
                                <DialogTitle>Detail Alasan Koreksi</DialogTitle>
                                <DialogDescription>
                                  Diajukan oleh {corr.requestedBy.name} ({corr.requestedBy.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tanggal Kehadiran</p>
                                    <p className="mt-1 font-semibold">{formatDate(corr.attendanceRecord.attendanceDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Studio Asal</p>
                                    <p className="mt-1">{corr.requestedBy.defaultStudio?.name ?? "-"}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Status Lama</p>
                                    <Badge variant="outline" className={corr.previousStatus ? statusColor[corr.previousStatus] : "mt-1"}>
                                      {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Status Baru</p>
                                    <Badge variant="outline" className={corr.newStatus ? statusColor[corr.newStatus] : "mt-1"}>
                                      {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Jam Check-In Baru</p>
                                    <p className="mt-1 font-medium">{corr.newCheckInAt ? formatTime(corr.newCheckInAt) : "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Jam Check-Out Baru</p>
                                    <p className="mt-1 font-medium">{corr.newCheckOutAt ? formatTime(corr.newCheckOutAt) : "-"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Alasan Lengkap</p>
                                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-850 dark:text-zinc-200">{corr.reason}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <form action={reviewCorrectionAction} method="POST">
                              <input type="hidden" name="id" value={corr.id} />
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
                              <input type="hidden" name="id" value={corr.id} />
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Clock className="size-5 text-zinc-500" />
                Riwayat Persetujuan Koreksi (50 Terakhir)
              </CardTitle>
              <CardDescription>
                Daftar permintaan koreksi data presensi yang telah disetujui atau ditolak.
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
                    <TableHead>Status</TableHead>
                    <TableHead>Ditinjau Oleh</TableHead>
                    {currentUser.role === "SUPER_ADMIN" && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyCorrections.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={currentUser.role === "SUPER_ADMIN" ? 9 : 8}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        Tidak ada riwayat koreksi.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyCorrections.map((corr) => (
                      <TableRow key={corr.id}>
                        <TableCell>
                          <div className="font-medium text-xs">{corr.requestedBy.name}</div>
                          <div className="text-[10px] text-zinc-500">{corr.requestedBy.email}</div>
                        </TableCell>
                        <TableCell className="text-xs">{corr.requestedBy.defaultStudio?.name ?? "-"}</TableCell>
                        <TableCell className="text-xs">{formatDate(corr.attendanceRecord.attendanceDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${corr.previousStatus ? statusColor[corr.previousStatus] : ""}`}>
                            {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${corr.newStatus ? statusColor[corr.newStatus] : ""}`}>
                            {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">
                          <Dialog>
                            <DialogTrigger asChild>
                              <span className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-medium">
                                {corr.reason}
                              </span>
                            </DialogTrigger>
                            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                              <DialogHeader>
                                <DialogTitle>Detail Alasan Koreksi (Riwayat)</DialogTitle>
                                <DialogDescription>
                                  Diajukan oleh {corr.requestedBy.name} ({corr.requestedBy.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tanggal Kehadiran</p>
                                    <p className="mt-1 font-semibold">{formatDate(corr.attendanceRecord.attendanceDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Studio Asal</p>
                                    <p className="mt-1">{corr.requestedBy.defaultStudio?.name ?? "-"}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Status Lama</p>
                                    <Badge variant="outline" className={corr.previousStatus ? statusColor[corr.previousStatus] : "mt-1"}>
                                      {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Status Baru</p>
                                    <Badge variant="outline" className={corr.newStatus ? statusColor[corr.newStatus] : "mt-1"}>
                                      {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Jam Check-In Baru</p>
                                    <p className="mt-1 font-medium">{corr.newCheckInAt ? formatTime(corr.newCheckInAt) : "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Jam Check-Out Baru</p>
                                    <p className="mt-1 font-medium">{corr.newCheckOutAt ? formatTime(corr.newCheckOutAt) : "-"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Alasan Lengkap</p>
                                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-850 dark:text-zinc-200">{corr.reason}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Status Pengajuan</p>
                                  <Badge className={`mt-1 ${requestStatusColor[corr.status]}`}>
                                    {requestStatusLabel[corr.status] ?? corr.status}
                                  </Badge>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${requestStatusColor[corr.status]}`}>
                            {requestStatusLabel[corr.status] ?? corr.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500">
                          {corr.approvedBy?.name ?? "-"}
                        </TableCell>
                        {currentUser.role === "SUPER_ADMIN" && (
                          <TableCell className="text-right">
                            <form action={deleteCorrectionAction} method="POST" onSubmit={(e) => {
                              if (!confirm("Apakah Anda yakin ingin menghapus koreksi ini secara permanen dan memulihkan data kehadiran sebelumnya?")) {
                                e.preventDefault();
                              }
                            }}>
                              <input type="hidden" name="correctionId" value={corr.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-2"
                              >
                                Hapus
                              </Button>
                            </form>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
