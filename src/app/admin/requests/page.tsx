import {
  Archive,
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
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewRequestAction } from "./actions";
import { reviewCorrectionAction } from "../corrections/actions";

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
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
  CANCELLED: "bg-zinc-100 text-zinc-800 border-zinc-300",
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
  OFF_DAY: "bg-zinc-200 text-zinc-700",
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
  approve: "Aksi persetujuan berhasil diproses.",
  reject: "Aksi penolakan berhasil diproses.",
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
      ? { type: { in: ["PERMISSION", "SICK", "WFH"] } }
      : {
          type: { in: ["PERMISSION", "SICK", "WFH"] },
          user: {
            defaultStudioId: currentUser.defaultStudioId,
            role: {
              notIn: ["ADMIN", "SUPER_ADMIN"],
            },
          },
        };

  const scopedWhereCorrections: Prisma.AttendanceCorrectionWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? {}
      : {
          attendanceRecord: {
            ownerStudioId: currentUser.defaultStudioId ?? "__NO_STUDIO__",
            user: {
              role: {
                notIn: ["ADMIN", "SUPER_ADMIN"],
              },
            },
          },
        };

  const [requests, corrections] = await Promise.all([
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
  ]);

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const reviewedRequests = requests.filter((r) => r.status !== "PENDING");

  const pendingCorrections = corrections.filter((c) => c.status === "PENDING");
  const reviewedCorrections = corrections.filter((c) => c.status !== "PENDING");

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
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
          {successMessages[params.success]}
        </div>
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
                        <TableCell className="max-w-[200px] truncate" title={req.reason}>
                          {req.reason}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="size-5 text-zinc-600" />
                Riwayat Persetujuan Izin
              </CardTitle>
              <CardDescription>
                Daftar pengajuan izin/ganti hari, sakit, dan WFH yang sudah diproses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama / Email</TableHead>
                    <TableHead>Studio</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Mulai - Selesai</TableHead>
                    <TableHead>Ganti Hari</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Lampiran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        Belum ada riwayat persetujuan perizinan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reviewedRequests.map((req) => (
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
                        <TableCell>
                          {formatDate(req.startDate)} - {formatDate(req.endDate)}
                        </TableCell>
                        <TableCell>{req.replacementDate ? formatDate(req.replacementDate) : "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={req.reason}>
                          {req.reason}
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
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={requestStatusColor[req.status]}
                          >
                            {requestStatusLabel[req.status] ?? req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-400">
                          {req.reviewer?.name ?? <span className="text-zinc-400 dark:text-zinc-500">-</span>}
                        </TableCell>
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
                        <TableCell className="max-w-[200px] truncate" title={corr.reason}>
                          {corr.reason}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="size-5 text-zinc-600" />
                Riwayat Persetujuan Koreksi
              </CardTitle>
              <CardDescription>
                Daftar permintaan koreksi data presensi yang sudah diproses sebelumnya.
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
                    <TableHead>Reviewer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewedCorrections.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        Belum ada riwayat persetujuan koreksi.
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
                          <Badge variant="outline" className={corr.previousStatus ? statusColor[corr.previousStatus] : ""}>
                            {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={corr.newStatus ? statusColor[corr.newStatus] : ""}>
                            {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                          </Badge>
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
                        <TableCell className="text-zinc-600 dark:text-zinc-400">
                          {corr.approvedBy?.name ?? <span className="text-zinc-400 dark:text-zinc-500">-</span>}
                        </TableCell>
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
