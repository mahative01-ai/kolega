import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Paperclip,
  XCircle,
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
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewRequestAction } from "./actions";

export const dynamic = "force-dynamic";

const requestTypeLabel: Record<string, string> = {
  PERMISSION: "Izin",
  SICK: "Sakit",
  LEAVE: "Cuti",
};

const requestTypeColor: Record<string, string> = {
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  LEAVE: "bg-sky-100 text-sky-800",
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const successMessages: Record<string, string> = {
  approve: "Pengajuan berhasil disetujui. Catatan presensi otomatis terbuat/diperbarui.",
  reject: "Pengajuan berhasil ditolak.",
};

const errorMessages: Record<string, string> = {
  "invalid-action": "Aksi tidak valid.",
  "not-found": "Pengajuan tidak ditemukan.",
  "already-reviewed": "Pengajuan sudah ditinjau sebelumnya.",
  "unauthorized-studio": "Anda tidak memiliki akses ke studio asal pengguna ini.",
};

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const params = await searchParams;

  // Filter requests based on user role (Admin sees their studio, Super Admin sees all)
  const scopedWhere: Prisma.RequestWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { type: { in: ["PERMISSION", "SICK", "LEAVE"] } }
      : {
          type: { in: ["PERMISSION", "SICK", "LEAVE"] },
          user: { defaultStudioId: currentUser.defaultStudioId },
        };

  const requests = await prisma.request.findMany({
    where: scopedWhere,
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
  });

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const reviewedRequests = requests.filter((r) => r.status !== "PENDING");

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/admin/requests"
      badge={currentUser.role === "SUPER_ADMIN" ? "Super Admin Approval" : "Admin Approval"}
      title="Persetujuan Izin / Sakit / Cuti"
      description={
        currentUser.role === "SUPER_ADMIN"
          ? "Kelola pengajuan perizinan seluruh member dari semua studio."
          : `Kelola pengajuan perizinan member untuk studio ${currentUser.defaultStudio?.name ?? ""}.`
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
              <ClipboardList className="size-5 text-amber-600" />
              Menunggu Persetujuan ({pendingRequests.length})
            </CardTitle>
            <CardDescription>
              Daftar izin, sakit, dan cuti baru yang diajukan oleh member dan membutuhkan tindakan Anda.
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
                  <TableHead>Alasan / Catatan</TableHead>
                  <TableHead>Lampiran</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      Tidak ada pengajuan yang membutuhkan persetujuan saat ini.
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
              Riwayat Persetujuan
            </CardTitle>
            <CardDescription>
              Daftar pengajuan izin, sakit, dan cuti yang sudah diproses sebelumnya.
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
                      colSpan={8}
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
                      <TableCell className="text-zinc-600">
                        {req.reviewer?.name ?? <span className="text-zinc-400">-</span>}
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
