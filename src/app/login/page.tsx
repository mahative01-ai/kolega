import { redirect } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, dateOnlyFromKey } from "@/lib/attendance-time";
import { loginAction } from "./actions";
import { QrLoginScanner } from "./qr-login-scanner";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "invalid": "Email atau password tidak sesuai.",
  "need-presence": "Akses dasbor terkunci. Silakan lakukan scan QR Card presensi atau verifikasi izin terlebih dahulu hari ini.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);

  const isRegistered = params.registered === "1";
  const errorMessage = params.error ? errorMessages[params.error] : null;

  let statusText = "Belum Check-in WFO";
  let statusColor = "bg-zinc-100 text-zinc-500 border-zinc-200";

  if (currentUser) {
    const todayKey = getJakartaDateKey();
    const todayDate = dateOnlyFromKey(todayKey);

    const attendance = await prisma.attendanceRecord.findUnique({
      where: {
        userId_attendanceDate: {
          userId: currentUser.id,
          attendanceDate: todayDate,
        },
      },
      select: {
        checkInAt: true,
        checkOutAt: true,
        status: true,
        lateMinutes: true,
        workMode: true,
      },
    });

    if (attendance) {
      if (attendance.status === "SICK") {
        statusText = "Sakit (Izin)";
        statusColor = "bg-red-50 text-red-700 border-red-200";
      } else if (attendance.status === "LEAVE") {
        statusText = "Cuti (Izin)";
        statusColor = "bg-blue-50 text-blue-700 border-blue-200";
      } else if (attendance.status === "PERMISSION") {
        statusText = "Izin Khusus";
        statusColor = "bg-amber-50 text-amber-700 border-amber-200";
      } else if (attendance.status === "ALPHA") {
        statusText = "Alpha";
        statusColor = "bg-red-50 text-red-700 border-red-200";
      } else if (attendance.checkInAt) {
        const checkInTime = new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        }).format(new Date(attendance.checkInAt));

        if (attendance.checkOutAt) {
          const checkOutTime = new Intl.DateTimeFormat("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta",
          }).format(new Date(attendance.checkOutAt));
          statusText = `WFO: Check-in ${checkInTime} & Check-out ${checkOutTime}`;
          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
        } else {
          if (attendance.status === "LATE") {
            statusText = `WFO: Check-in ${checkInTime} (Terlambat ${attendance.lateMinutes}m)`;
            statusColor = "bg-amber-50 text-amber-700 border-amber-200";
          } else {
            statusText = `WFO: Check-in ${checkInTime} (Tepat Waktu)`;
            statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
          }
        }
      }
    } else {
      const personalSchedule = await prisma.personalWorkSchedule.findUnique({
        where: {
          userId_workDate: {
            userId: currentUser.id,
            workDate: todayDate,
          },
        },
        select: { workMode: true },
      });

      if (personalSchedule?.workMode === "WFH") {
        statusText = "Jadwal WFH (Belum Check-in)";
        statusColor = "bg-blue-50 text-blue-700 border-blue-200";
      }
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-6 py-10 text-zinc-950">
      <Card className="w-full max-w-md shadow-lg border border-zinc-200">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="w-fit bg-white">
            MahaTeams New Gen
          </Badge>
          <CardTitle className="text-xl font-bold">
            {currentUser ? "Sesi Presensi Aktif" : "Login Dashboard"}
          </CardTitle>
          <CardDescription>
            {currentUser
              ? "Pindai QR Card Anda untuk mencatatkan kehadiran atau mengajukan izin hari ini."
              : "Pilih cara masuk untuk membuka dasbor Anda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
              {errorMessage}
            </p>
          ) : null}

          {isRegistered ? (
            <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 border border-emerald-100">
              Registrasi berhasil. Silakan login.
            </p>
          ) : null}

          {currentUser ? (
            <QrLoginScanner
              autoStart={true}
              currentUser={{
                name: currentUser.name,
                role: currentUser.role,
                studioName: currentUser.defaultStudio?.name || "Mahative/Kipa",
                statusText,
                statusColor,
              }}
            />
          ) : (
            <Tabs defaultValue="credentials" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="credentials">Kredensial</TabsTrigger>
                <TabsTrigger value="qr">Scan QR Card</TabsTrigger>
              </TabsList>

              <TabsContent value="credentials">
                <form action={loginAction} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="nama@email.com"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Masukkan password"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      className="size-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-sm text-zinc-600 cursor-pointer select-none"
                    >
                      Ingat saya (30 hari)
                    </label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-zinc-950 text-white hover:bg-zinc-900"
                  >
                    Masuk dengan Kredensial
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="qr">
                <QrLoginScanner />
              </TabsContent>
            </Tabs>
          )}

          {!currentUser ? (
            <div className="mt-6 rounded-md bg-zinc-100 p-3 text-[11px] text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-700">Info Akun Preview:</p>
              <p>Super Admin: owner@mahateams.local / owner123</p>
              <p>Admin: admin.mahative@mahateams.local / admin123</p>
              <p>Member: member@mahateams.local / member123</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
