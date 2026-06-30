import {
  Download,
  CalendarClock,
  Clock3,
  History,
  QrCode,
  ShieldCheck,
  FileText,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { createPersonalQrCredentialAction } from "./actions";
import { QrScannerForm } from "./qr-scanner-form";
import { WfhForm } from "./wfh-form";

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

const successMessage: Record<string, string> = {
  "qr-created": "QR Card aktif dan siap dipakai.",
  checkin: "Check-in berhasil tersimpan.",
  checkout: "Check-out berhasil tersimpan.",
  done: "Presensi hari ini sudah selesai.",
};

const errorMessage: Record<string, string> = {
  qr: "QR tidak valid untuk akun ini.",
  studio: "Default Studio belum tersedia di akun ini.",
  mode: "Presensi hari ini tidak sesuai dengan jadwal Anda.",
  alpha:
    "Batas presensi pukul 12.00 telah lewat. Status hari ini tercatat Alpha.",
};

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function getJakartaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function dateOnlyFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date);
}

function formatTime(date: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date);
}

async function getPresensiData(userId: string) {
  const todayKey = getJakartaDateKey();
  const attendanceDate = dateOnlyFromKey(todayKey);

  const [qrCredential, attendanceRecord, personalSchedule] = await Promise.all([
    prisma.qrCredential.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      orderBy: {
        issuedAt: "desc",
      },
      select: {
        qrUid: true,
        issuedAt: true,
      },
    }),
    prisma.attendanceRecord.findUnique({
      where: {
        userId_attendanceDate: {
          userId,
          attendanceDate,
        },
      },
      select: {
        id: true,
        attendanceDate: true,
        workMode: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        lateMinutes: true,
        wfhPlan: true,
        wfhReport: true,
        ownerStudio: {
          select: {
            name: true,
          },
        },
        locationStudio: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.personalWorkSchedule.findUnique({
      where: {
        userId_workDate: {
          userId,
          workDate: attendanceDate,
        },
      },
      select: {
        workMode: true,
      },
    }),
  ]);

  return {
    attendanceDate,
    attendanceRecord,
    qrCredential,
    personalSchedule,
  };
}

export default async function PersonalPresensiPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    requireAnyRole(["ADMIN", "MEMBER"]),
    searchParams,
  ]);
  const data = await getPresensiData(currentUser.id);
  const qrSvg = data.qrCredential
    ? await QRCode.toString(data.qrCredential.qrUid, {
        type: "svg",
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      })
    : null;
  const hasQr = Boolean(data.qrCredential);
  const hasCheckedIn = Boolean(data.attendanceRecord?.checkInAt);
  const hasCheckedOut = Boolean(data.attendanceRecord?.checkOutAt);
  const submitLabel = hasCheckedIn ? "Check-out WFO" : "Check-in WFO";
  const isWfhMode = data.personalSchedule?.workMode === "WFH" || data.attendanceRecord?.workMode === "WFH";

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/presensi"
      badge={isWfhMode ? "Presensi WFH" : "Presensi WFO"}
      title={isWfhMode ? "Laporan Harian WFH" : "Scan QR Presensi"}
      description={
        isWfhMode
          ? `Halo ${currentUser.name}. Tulis rencana dan laporan kerja Anda hari ini.`
          : `Halo ${currentUser.name}. Download QR Card sekali, simpan, lalu scan QR untuk presensi WFO.`
      }
    >
      {params.success && successMessage[params.success] ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage[params.success]}
        </div>
      ) : null}

      {params.error && errorMessage[params.error] ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage[params.error]}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        {isWfhMode ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-5 text-blue-700" />
                Mode Kerja: WFH
              </CardTitle>
              <CardDescription>
                Hari ini Anda dijadwalkan untuk bekerja secara Work From Home.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800">
                <p>
                  Anda tidak memerlukan kartu QR fisik untuk melakukan presensi hari ini. Silakan gunakan formulir rencana kerja dan laporan harian di sebelah kanan.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5 text-zinc-700" />
                QR Card
              </CardTitle>
              <CardDescription>
                Identitas presensi WFO untuk akun yang sedang login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasQr ? (
                <>
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div
                      className="mx-auto flex size-56 items-center justify-center [&_svg]:size-52"
                      dangerouslySetInnerHTML={{ __html: qrSvg ?? "" }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-500">QR UID</p>
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm">
                      {data.qrCredential?.qrUid}
                    </div>
                    <p className="text-xs text-zinc-500">
                      Aktif sejak {formatDate(data.qrCredential?.issuedAt ?? new Date())}.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <a
                      href="/member/presensi/qr-card?format=png"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full"
                      )}
                    >
                      <Download aria-hidden="true" />
                      Download PNG
                    </a>
                    <a
                      href="/member/presensi/qr-card?format=jpeg"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full"
                      )}
                    >
                      <Download aria-hidden="true" />
                      Download JPEG
                    </a>
                  </div>
                </>
              ) : (
                <form action={createPersonalQrCredentialAction}>
                  <Button type="submit" className="w-full">
                    <ShieldCheck aria-hidden="true" />
                    Aktifkan QR Card
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-5 text-blue-700" />
                Presensi Hari Ini
              </CardTitle>
              <CardDescription>
                {formatDate(data.attendanceDate)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <p className="text-xs text-zinc-500">Check-in</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatTime(data.attendanceRecord?.checkInAt ?? null)}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <p className="text-xs text-zinc-500">Check-out</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatTime(data.attendanceRecord?.checkOutAt ?? null)}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <p className="text-xs text-zinc-500">Status</p>
                <div className="mt-2">
                  {data.attendanceRecord ? (
                    <Badge
                      variant="secondary"
                      className={statusColor[data.attendanceRecord.status]}
                    >
                      {statusLabel[data.attendanceRecord.status] ??
                        data.attendanceRecord.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Belum Presensi</Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <Link
                href="/member/presensi/riwayat"
                className={buttonVariants({ variant: "outline" })}
              >
                <History aria-hidden="true" />
                Lihat Riwayat Presensi
              </Link>
            </CardContent>
          </Card>

          {isWfhMode ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5 text-emerald-700" />
                  Presensi WFH
                </CardTitle>
                <CardDescription>
                  Isi rencana kerja di pagi hari untuk check-in, dan isi laporan kerja di sore hari untuk check-out.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WfhForm
                  hasCheckedIn={hasCheckedIn}
                  hasCheckedOut={hasCheckedOut}
                  checkInPlan={data.attendanceRecord?.wfhPlan}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="size-5 text-emerald-700" />
                  Scan QR
                </CardTitle>
                <CardDescription>
                  Kamera membaca QR Card yang sudah disimpan. Setelah QR terbaca,
                  tombol presensi akan aktif.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QrScannerForm
                  disabled={!hasQr || hasCheckedOut}
                  submitLabel={hasCheckedOut ? "Presensi Selesai" : submitLabel}
                />
                {data.attendanceRecord?.lateMinutes ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-orange-700">
                    <Clock3 className="size-4" />
                    Terlambat {data.attendanceRecord.lateMinutes} menit.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
