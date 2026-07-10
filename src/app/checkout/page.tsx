import { Terminal } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, dateOnlyFromKey } from "@/lib/attendance-time";
import { QrLoginScanner } from "@/app/login/qr-login-scanner";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const currentUser = await getCurrentUser();

  let statusText = "Scan QR Card untuk check-out";
  let statusColor = "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400";

  if (currentUser) {
    const todayDate = dateOnlyFromKey(getJakartaDateKey());
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
      },
    });

    if (attendance?.checkOutAt) {
      statusText = "Sudah check-out hari ini";
      statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50";
    } else if (attendance?.checkInAt) {
      statusText = "Siap check-out";
      statusColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-zinc-50 p-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 md:p-10">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950">
            <Terminal className="size-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Check-out WFO</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Scan QR Card dan izinkan lokasi untuk menyelesaikan presensi hari ini.
          </p>
        </div>

        <QrLoginScanner
          action="checkout"
          autoStart={Boolean(currentUser)}
          currentUser={
            currentUser
              ? {
                  name: currentUser.name,
                  role: currentUser.role,
                  studioName: currentUser.defaultStudio?.name || "Mahative/Kipa",
                  statusText,
                  statusColor,
                }
              : undefined
          }
        />
      </div>
    </main>
  );
}
