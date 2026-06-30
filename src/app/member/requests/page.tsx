import {
  CalendarDays,
  FileText,
  Paperclip,
  PlusCircle,
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
import { Input } from "@/components/ui/input";
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
import { createRequestAction } from "./actions";

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
  created: "Pengajuan izin berhasil diajukan dan sedang menunggu persetujuan.",
};

const errorMessages: Record<string, string> = {
  "invalid-type": "Tipe pengajuan tidak valid.",
  "missing-fields": "Mohon isi semua bidang yang wajib diisi.",
  "invalid-dates": "Format tanggal tidak valid.",
  "date-range": "Tanggal selesai tidak boleh sebelum tanggal mulai.",
  "file-size": "Ukuran file lampiran terlalu besar (maksimal 2MB).",
  "upload-failed": "Gagal memproses lampiran berkas.",
};

export default async function MemberRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireRole("MEMBER");
  const params = await searchParams;

  const requests = await prisma.request.findMany({
    where: {
      userId: currentUser.id,
      type: { in: ["PERMISSION", "SICK", "LEAVE"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: {
        select: { name: true },
      },
    },
  });

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/requests"
      badge="Formulir Member"
      title="Pengajuan Izin / Sakit / Cuti"
      description="Ajukan perizinan tidak masuk kerja, sakit dengan surat dokter, atau cuti tahunan di halaman ini."
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
              Buat Pengajuan
            </CardTitle>
            <CardDescription>
              Isi data pengajuan dengan lengkap. Status pengajuan default adalah MENUNGGU.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createRequestAction}
              method="POST"
              encType="multipart/form-data"
              className="grid gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="request-type" className="text-sm font-medium">
                  Tipe Pengajuan <span className="text-red-500">*</span>
                </label>
                <select
                  id="request-type"
                  name="type"
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  required
                >
                  <option value="PERMISSION">Izin tidak masuk</option>
                  <option value="SICK">Sakit (Keterangan Dokter)</option>
                  <option value="LEAVE">Cuti Tahunan</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="start-date" className="text-sm font-medium">
                    Mulai Tanggal <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="start-date"
                    name="startDate"
                    type="date"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="end-date" className="text-sm font-medium">
                    Selesai Tanggal <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="end-date"
                    name="endDate"
                    type="date"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reason" className="text-sm font-medium">
                  Alasan / Keterangan <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Jelaskan alasan izin secara ringkas dan jelas..."
                  required
                  rows={4}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="attachment" className="text-sm font-medium">
                  Lampiran Berkas (opsional, maks 2MB)
                </label>
                <Input
                  id="attachment"
                  name="attachment"
                  type="file"
                  accept="image/*,application/pdf"
                  className="cursor-pointer file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-zinc-800"
                />
              </div>

              <Button type="submit" className="w-full mt-2">
                <CalendarDays className="size-4 mr-2" />
                Kirim Pengajuan
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-zinc-700" />
              Riwayat Pengajuan
            </CardTitle>
            <CardDescription>
              Daftar izin, sakit, dan cuti yang pernah Anda ajukan beserta status terkininya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Selesai</TableHead>
                  <TableHead>Alasan / Catatan</TableHead>
                  <TableHead>Lampiran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      Belum ada riwayat pengajuan perizinan.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
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
