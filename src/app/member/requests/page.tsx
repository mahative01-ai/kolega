import {
  CalendarDays,
  FileText,
  Paperclip,
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
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRequestAction, cancelRequestAction } from "./actions";

export const dynamic = "force-dynamic";

const requestTypeLabel: Record<string, string> = {
  PERMISSION: "Izin Pribadi",
  SICK: "Sakit Resmi",
  DISPENSATION: "Dispensasi",
  LEAVE: "Cuti",
  WFH: "WFH",
};

const requestTypeColor: Record<string, string> = {
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  DISPENSATION: "bg-emerald-100 text-emerald-800",
  LEAVE: "bg-blue-100 text-blue-800",
  WFH: "bg-indigo-100 text-indigo-800",
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
  cancelled: "Pengajuan izin berhasil dibatalkan.",
};

const errorMessages: Record<string, string> = {
  "invalid-type": "Tipe pengajuan tidak valid.",
  "missing-fields": "Mohon isi semua bidang yang wajib diisi.",
  "invalid-dates": "Format tanggal tidak valid.",
  "date-range": "Tanggal selesai tidak boleh sebelum tanggal mulai.",
  "file-size": "Ukuran file lampiran terlalu besar (maksimal 2MB).",
  "upload-failed": "Gagal memproses lampiran berkas.",
  "leave-notice": "Pengajuan izin dan cuti hanya dapat diajukan minimal H-1.",
  "replacement-date": "Tanggal ganti hari harus setelah rentang izin.",
  "sick-notice": "Pengajuan sakit hari ini harus dilakukan maksimal 1 jam sebelum jam masuk (sebelum 07:00 pagi).",
  "attachment-required": "Dispensasi wajib menyertakan lampiran resmi.",
  "past-date": "Tanggal mulai pengajuan tidak boleh berada di masa lampau.",
  "intern-wfh": "Intern tidak diperbolehkan mengajukan WFH. Hanya Anggota Team dan Admin yang dapat mengajukan WFH.",
  "intern-leave": "Intern tidak memiliki akses pengajuan cuti. Gunakan izin atau sakit sesuai kebutuhan.",
  "overlapping-request": "Anda sudah memiliki pengajuan aktif (Menunggu/Disetujui) pada rentang tanggal tersebut.",
  "already-processed": "Pengajuan tidak dapat dibatalkan karena sudah ditinjau oleh Admin.",
  "not-found": "Pengajuan tidak ditemukan.",
  unauthorized: "Anda tidak memiliki akses untuk membatalkan pengajuan ini.",
};

export default async function MemberRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const params = await searchParams;
  const canRequestAnnualLeave = currentUser.memberStatus === "TEAM";

  const userWithBalance = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { annualLeaveBalance: true },
  });
  const leaveBalance = userWithBalance?.annualLeaveBalance ?? 12;

  const requests = await prisma.request.findMany({
    where: {
      userId: currentUser.id,
      type: { in: ["PERMISSION", "SICK", "DISPENSATION", "LEAVE", "WFH"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
      reason: true,
      attachmentUrl: true,
      createdAt: true,
      updatedAt: true,
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
      title="Pengajuan Izin / Sakit / Dispensasi / WFH"
      description="Ajukan izin pribadi, sakit resmi, dispensasi, atau WFH di halaman ini."
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
            {canRequestAnnualLeave ? (
              <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Jatah Cuti Tahunan</p>
                  <p className="text-xs text-zinc-500">Sisa jatah cuti aktif Anda</p>
                </div>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  {leaveBalance} <span className="text-xs font-normal text-zinc-500">Hari</span>
                </p>
              </div>
            ) : null}
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
                  className="h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-zinc-950 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-300"
                  required
                >
                  <option value="PERMISSION">Izin Pribadi / Tanpa Surat (Min H-1)</option>
                  <option value="SICK">Sakit Resmi (Surat Dokter; tanpa surat menjadi Izin)</option>
                  <option value="DISPENSATION">Dispensasi Resmi (Wajib Lampiran)</option>
                  {canRequestAnnualLeave ? (
                    <option value="LEAVE">Cuti (Min H-1, Potong Saldo)</option>
                  ) : null}
                  <option value="WFH">Pengajuan WFH</option>
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
                  Lampiran Berkas <span className="text-xs font-normal text-zinc-500">(wajib untuk Dispensasi; Sakit tanpa surat menjadi Izin, maks 2MB)</span>
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
              Daftar izin, sakit, dispensasi, dan WFH yang pernah Anda ajukan beserta status terkininya.
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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
                      <TableCell className="text-right">
                        {req.status === "PENDING" ? (
                          <form action={cancelRequestAction} method="POST">
                            <input type="hidden" name="requestId" value={req.id} />
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
