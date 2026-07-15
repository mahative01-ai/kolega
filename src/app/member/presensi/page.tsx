import Link from "next/link";
import { Clock3, ArrowLeft, ShieldAlert, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, dateOnlyFromKey } from "@/lib/attendance-time";
import { cn } from "@/lib/utils";
import { QrScannerForm } from "./qr-scanner-form";
import { ConfettiTrigger } from "@/components/confetti-trigger";

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
};

function formatTime(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

const successMessages: Record<string, string> = {
  checkin: "Berhasil melakukan check-in WFO!",
  checkout: "Berhasil melakukan check-out WFO!",
  done: "Presensi hari ini sudah selesai dilakukan.",
};

const errorMessages: Record<string, string> = {
  qr: "Kartu QR tidak valid atau dinonaktifkan.",
  studio: "Studio penempatan Anda tidak ditemukan.",
  "missing-checkout": "Anda belum check-out pada hari sebelumnya. Silakan ajukan koreksi presensi di dashboard.",
  mode: "Status atau mode kerja tidak valid untuk presensi WFO hari ini.",
  alpha: "Waktu cutoff presensi sudah terlewati. Anda ditandai Alpa.",
  "location-required": "GPS / Lokasi diperlukan untuk memverifikasi presensi WFO.",
  "studio-location-missing": "Lokasi GPS Studio penempatan belum dikonfigurasi oleh admin.",
  "checkout-too-early": "Check-out belum dibuka. Durasi kerja hari ini belum terpenuhi.",
};

export default async function MemberPresensiPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; time?: string; remaining?: string }>;
}) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const dashboardPath = currentUser.role === "ADMIN" ? "/admin" : "/member";

  const params = await searchParams;

  const todayKey = getJakartaDateKey();
  const todayDate = dateOnlyFromKey(todayKey);

  const [existingRecord, hasQr] = await Promise.all([
    prisma.attendanceRecord.findUnique({
      where: {
        userId_attendanceDate: {
          userId: currentUser.id,
          attendanceDate: todayDate,
        },
      },
      select: {
        id: true,
        checkInAt: true,
        checkOutAt: true,
        status: true,
        workMode: true,
        lateMinutes: true,
      },
    }),
    prisma.qrCredential.findFirst({
      where: {
        userId: currentUser.id,
        status: "ACTIVE",
      },
      select: { id: true },
    }).then(Boolean),
  ]);

  const hasCheckedIn = Boolean(existingRecord?.checkInAt);
  const hasCheckedOut = Boolean(existingRecord?.checkOutAt);

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member"
      badge="Scan QR / Kamera"
      title="Presensi WFO Manual"
      description="Scan QR Card Anda menggunakan kamera perangkat ini untuk melakukan Check-in atau Check-out WFO."
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {params.success && successMessages[params.success] ? (
          <>
            <ConfettiTrigger />
            <div className="rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-400">
              {successMessages[params.success]}
            </div>
          </>
        ) : null}

        {params.error ? (
          <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {params.error === "checkout-too-early" ? (
              <span>
                Check-out baru dibuka pukul <strong>{params.time}</strong>
                {params.remaining ? `, sisa ${params.remaining} menit.` : "."}
              </span>
            ) : (
              errorMessages[params.error] || "Terjadi kesalahan saat memproses presensi."
            )}
          </div>
        ) : null}
        <Link
          href={dashboardPath}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "flex items-center gap-1.5 w-fit")}
        >
          <ArrowLeft className="size-4" />
          Kembali ke Dashboard
        </Link>

        {/* Status Card */}
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock3 className="size-4 text-blue-700 dark:text-blue-400" />
              Status Presensi Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5">
              <p className="text-zinc-500 font-medium">Check-in</p>
              <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {formatTime(existingRecord?.checkInAt ?? null)}
              </p>
            </div>
            <div className="rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5">
              <p className="text-zinc-500 font-medium">Check-out</p>
              <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {formatTime(existingRecord?.checkOutAt ?? null)}
              </p>
            </div>
            <div className="rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5">
              <p className="text-zinc-500 font-medium">Status Kerja</p>
              <div className="mt-1">
                {existingRecord ? (
                  <Badge className={cn("text-[10px] font-semibold border shadow-none", statusColor[existingRecord.status])}>
                    {statusLabel[existingRecord.status] ?? existingRecord.status}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-zinc-500 dark:text-zinc-400 text-[10px] shadow-none">
                    Belum Presensi
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
          {existingRecord?.lateMinutes ? (
            <CardContent className="pt-0">
              <p className="flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-400 font-medium">
                <ShieldAlert className="size-4" />
                Terlambat {existingRecord.lateMinutes} menit.
              </p>
            </CardContent>
          ) : null}
        </Card>

        {/* Scanner Card */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <QrCode className="size-4 text-emerald-600" />
              Kamera Scanner QR
            </CardTitle>
            <CardDescription className="text-xs">
              Pindai QR Card aktif Anda untuk melakukan check-in atau check-out.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <QrScannerForm
              disabled={!hasQr || hasCheckedOut}
              submitLabel={hasCheckedOut ? "Presensi Selesai" : (hasCheckedIn ? "Check-out WFO" : "Check-in WFO")}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
