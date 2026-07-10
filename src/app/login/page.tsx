import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, dateOnlyFromKey } from "@/lib/attendance-time";
import { loginAction, unlockRequestsAction } from "./actions";
import { QrLoginScanner } from "./qr-login-scanner";
import { Terminal } from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "invalid": "Email atau password tidak sesuai.",
  "need-presence": "Akses dasbor terkunci. Silakan lakukan scan QR Card presensi atau verifikasi izin terlebih dahulu hari ini.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string; action?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);

  if (currentUser && currentUser.role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }

  const isRegistered = params.registered === "1";
  const errorMessage = params.error ? errorMessages[params.error] : null;

  let statusText = "Belum Check-in WFO";
  let statusColor = "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400";

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
        statusColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50";
      } else if (attendance.status === "LEAVE") {
        statusText = "Cuti (Izin)";
        statusColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50";
      } else if (attendance.status === "PERMISSION") {
        statusText = "Izin Khusus";
        statusColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
      } else if (attendance.status === "ALPHA") {
        statusText = "Alpha";
        statusColor = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50";
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
          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
        } else {
          if (attendance.status === "LATE") {
            statusText = `WFO: Check-in ${checkInTime} (Terlambat ${attendance.lateMinutes}m)`;
            statusColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
          } else {
            statusText = `WFO: Check-in ${checkInTime} (Tepat Waktu)`;
            statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
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
        statusColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50";
      }
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10 text-zinc-950 dark:text-zinc-50 transition-colors duration-200">
      <div className="w-full max-w-sm flex flex-col gap-6 bg-white dark:bg-zinc-900/40 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md">
        
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950">
            <Terminal className="size-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Kolega New Gen</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {currentUser
              ? "Pindai QR Card Anda untuk mencatatkan kehadiran."
              : "Pilih cara masuk untuk membuka dasbor Anda."}
          </p>
        </div>

        {/* Action Messages */}
        {errorMessage && (
          <p className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50">
            {errorMessage}
          </p>
        )}

        {isRegistered && (
          <p className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
            Registrasi berhasil. Silakan login.
          </p>
        )}

        {/* Content Tabs / Scanner */}
        {currentUser ? (
          <div className="grid gap-4">
            <QrLoginScanner
              autoStart={true}
              action={params.action}
              currentUser={{
                name: currentUser.name,
                role: currentUser.role,
                studioName: currentUser.defaultStudio?.name || "Mahative/Kipa",
                statusText,
                statusColor,
              }}
            />
            <form action={unlockRequestsAction}>
              <Button type="submit" variant="secondary" className="w-full text-xs">
                🤒 / ✈️ Saya Sedang Sakit / Cuti
              </Button>
            </form>
          </div>
        ) : (
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-zinc-100 dark:bg-zinc-800">
              <TabsTrigger value="credentials" className="text-xs">Kredensial</TabsTrigger>
              <TabsTrigger value="qr" className="text-xs">Scan QR Card</TabsTrigger>
            </TabsList>

            <TabsContent value="credentials">
              <form action={loginAction}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="nama@email.com"
                      required
                      className="dark:bg-zinc-950 dark:border-zinc-800"
                    />
                  </Field>
                  
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Masukkan password"
                      required
                      className="dark:bg-zinc-950 dark:border-zinc-800"
                    />
                  </Field>

                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      className="size-4 rounded border-zinc-300 dark:border-zinc-800 text-zinc-950 focus:ring-zinc-950 dark:bg-zinc-950 dark:checked:bg-zinc-50 cursor-pointer"
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none"
                    >
                      Ingat saya (30 hari)
                    </label>
                  </div>

                  <Field className="mt-1">
                    <Button
                      type="submit"
                      className="w-full bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium"
                    >
                      Masuk dengan Kredensial
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </TabsContent>

            <TabsContent value="qr">
              <QrLoginScanner action={params.action} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
}
