import {
  BadgeCheck,
  CalendarClock,
  Clock3,
  LogIn,
  LogOut,
  QrCode,
  ShieldCheck,
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
import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createMemberQrCredentialAction,
  submitWfoAttendanceAction,
} from "./actions";

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
  checkin: "Check-in WFO berhasil tersimpan.",
  checkout: "Check-out WFO berhasil tersimpan.",
  done: "Presensi hari ini sudah selesai.",
};

const errorMessage: Record<string, string> = {
  qr: "QR tidak valid untuk akun ini.",
  studio: "Default Studio belum tersedia di akun ini.",
  mode: "Presensi hari ini bukan mode WFO.",
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

function getQrCells(value: string) {
  const source = value || "MAHATEAMS";

  return Array.from({ length: 81 }, (_, index) => {
    const code = source.charCodeAt(index % source.length);

    return (code + index * 7) % 3 !== 0;
  });
}

async function getPresensiData(userId: string) {
  const todayKey = getJakartaDateKey();
  const attendanceDate = dateOnlyFromKey(todayKey);

  const [qrCredential, attendanceRecord] = await Promise.all([
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
  ]);

  return {
    attendanceDate,
    attendanceRecord,
    qrCredential,
  };
}

export default async function MemberPresensiPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    requireRole("MEMBER"),
    searchParams,
  ]);
  const data = await getPresensiData(currentUser.id);
  const qrCells = getQrCells(data.qrCredential?.qrUid ?? "");
  const hasQr = Boolean(data.qrCredential);
  const hasCheckedIn = Boolean(data.attendanceRecord?.checkInAt);
  const hasCheckedOut = Boolean(data.attendanceRecord?.checkOutAt);
  const submitLabel = hasCheckedIn ? "Check-out WFO" : "Check-in WFO";
  const SubmitIcon = hasCheckedIn ? LogOut : LogIn;

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/presensi"
      badge="Presensi WFO"
      title="Scan QR Presensi"
      description={`Halo ${currentUser.name}. Presensi WFO untuk hari ini.`}
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
                  <div className="mx-auto grid size-48 grid-cols-9 gap-1 rounded-md bg-zinc-50 p-3">
                    {qrCells.map((active, index) => (
                      <div
                        key={index}
                        className={`rounded-sm ${
                          active ? "bg-zinc-950" : "bg-zinc-200"
                        }`}
                      />
                    ))}
                  </div>
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
              </>
            ) : (
              <form action={createMemberQrCredentialAction}>
                <Button type="submit" className="w-full">
                  <ShieldCheck aria-hidden="true" />
                  Aktifkan QR Card
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="size-5 text-emerald-700" />
                Scan QR
              </CardTitle>
              <CardDescription>
                Validasi QR dilakukan terhadap QR Card aktif milik akun ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={submitWfoAttendanceAction} className="grid gap-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="qrUid" className="text-sm font-medium">
                    QR UID
                  </label>
                  <Input
                    id="qrUid"
                    name="qrUid"
                    defaultValue={data.qrCredential?.qrUid ?? ""}
                    placeholder="Aktifkan QR Card terlebih dahulu"
                    disabled={!hasQr || hasCheckedOut}
                    required
                  />
                </div>
                <Button type="submit" disabled={!hasQr || hasCheckedOut}>
                  <SubmitIcon aria-hidden="true" />
                  {hasCheckedOut ? "Presensi Selesai" : submitLabel}
                </Button>
              </form>
              {data.attendanceRecord?.lateMinutes ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-orange-700">
                  <Clock3 className="size-4" />
                  Terlambat {data.attendanceRecord.lateMinutes} menit.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </DashboardShell>
  );
}
