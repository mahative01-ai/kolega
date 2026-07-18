import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, dateOnlyFromKey } from "@/lib/attendance-time";
import { formatMinutesAsClock, getCheckoutEligibility } from "@/lib/checkout-policy";
import { loginAction } from "./actions";
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
  "archived": "Akun Anda saat ini sedang dinonaktifkan sementara (diarsipkan). Silakan hubungi administrator untuk bantuan lebih lanjut.",
  "inactive": "Akun Anda saat ini sedang dinonaktifkan. Silakan hubungi administrator.",
};

const successMessages: Record<string, string> = {
  "reset-password": "Password berhasil diperbarui. Silakan masuk dengan password baru.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string; action?: string; success?: string }>;
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
  const successMessage = params.success ? successMessages[params.success] : null;

  let statusText = "Belum Check-in WFO";
  let statusColor = "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400";
  let scannerDisabled = false;
  let scannerDisabledMessage = "Scan belum tersedia.";

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
        statusText = "Ganti Hari";
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

          if (params.action === "checkout") {
            const activePlacement = await prisma.placement.findFirst({
              where: {
                userId: currentUser.id,
                status: "ACTIVE",
              },
              select: { studioId: true },
            });
            const currentStudioId = activePlacement?.studioId ?? currentUser.defaultStudioId;
            const policy = currentStudioId
              ? await prisma.attendancePolicy.findFirst({
                  where: { studioId: currentStudioId, isActive: true },
                  orderBy: { createdAt: "desc" },
                  select: { checkInTime: true, checkOutTime: true },
                })
              : null;
            const eligibility = getCheckoutEligibility({
              checkInAt: attendance.checkInAt,
              policy,
            });

            if (!eligibility.isAllowed) {
              const allowedClock = formatMinutesAsClock(eligibility.allowedCheckoutMinutes);
              statusText = `Check-out dibuka ${allowedClock}`;
              statusColor = "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300";
              scannerDisabled = true;
              scannerDisabledMessage = `Check-out baru dibuka pukul ${allowedClock}. Sisa ${eligibility.remainingMinutes} menit.`;
            }
          }
        }
      }
    } else if (params.action === "checkout") {
      scannerDisabled = true;
      scannerDisabledMessage = "Anda belum check-in WFO hari ini.";
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
          <h1 className="text-xl font-bold tracking-tight">Kolega</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {currentUser
              ? "Scan your QR Card to log your attendance."
              : "Choose a login method to open your dashboard."}
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

        {successMessage && (
          <p className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
            {successMessage}
          </p>
        )}

        {/* Content Tabs / Scanner */}
        {currentUser ? (
          <div className="grid gap-4">
            <QrLoginScanner
              autoStart={!scannerDisabled}
              action={params.action}
              disabled={scannerDisabled}
              disabledMessage={scannerDisabledMessage}
              currentUser={{
                name: currentUser.name,
                role: currentUser.role,
                studioName: currentUser.defaultStudio?.name || "Mahative/Kipa",
                statusText,
                statusColor,
              }}
            />
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
                    <PasswordInput
                      id="password"
                      name="password"
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

                  <div className="text-right">
                    <a
                      href="/forgot-password"
                      className="text-xs font-medium text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Lupa password?
                    </a>
                  </div>

                  <Field className="mt-1 gap-2">
                    <Button
                      type="submit"
                      className="w-full bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium"
                    >
                      Masuk dengan Kredensial
                    </Button>
                    <Button
                      type="submit"
                      name="intent"
                      value="request"
                      variant="secondary"
                      className="w-full font-medium"
                    >
                      Ajukan Izin, Sakit, atau Cuti
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

