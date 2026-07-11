import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnlyFromKey, getJakartaDateKey } from "@/lib/attendance-time";

export const dynamic = "force-dynamic";

function getMonthRange() {
  const todayKey = getJakartaDateKey();
  const [year, month] = todayKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));

  return { start, end, today: dateOnlyFromKey(todayKey) };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default async function MemberSchedulesPage() {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const { start, end, today } = getMonthRange();

  const [personalSchedules, todaySchedule] = await Promise.all([
    prisma.personalWorkSchedule.findMany({
      where: {
        userId: currentUser.id,
        workDate: { gte: start, lte: end },
      },
      orderBy: { workDate: "asc" },
      include: {
        studio: {
          select: { name: true },
        },
      },
    }),
    prisma.personalWorkSchedule.findUnique({
      where: {
        userId_workDate: {
          userId: currentUser.id,
          workDate: today,
        },
      },
    }),
  ]);

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/schedules"
      badge="Jadwal Personal"
      title="Jadwal Saya"
      description="Jadwal WFO/WFH personal yang diatur oleh Super Admin."
    >
      <div className="grid gap-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-5 text-blue-700" />
              Status Hari Ini
            </CardTitle>
            <CardDescription>
              Jika tidak ada jadwal khusus, mode kerja mengikuti default studio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={todaySchedule?.workMode === "WFH" ? "secondary" : "outline"}>
              {todaySchedule?.workMode ?? "Default WFO"}
            </Badge>
            {todaySchedule?.note ? (
              <p className="mt-2 text-sm text-zinc-500">{todaySchedule.note}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Jadwal Khusus Bulan Ini</CardTitle>
            <CardDescription>
              Menampilkan jadwal personal yang berbeda dari default.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Studio</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personalSchedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-sm text-zinc-500">
                      Belum ada jadwal personal bulan ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  personalSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{formatDate(schedule.workDate)}</TableCell>
                      <TableCell>
                        <Badge variant={schedule.workMode === "WFH" ? "secondary" : "outline"}>
                          {schedule.workMode}
                        </Badge>
                      </TableCell>
                      <TableCell>{schedule.studio?.name ?? currentUser.defaultStudio?.name ?? "-"}</TableCell>
                      <TableCell>{schedule.note ?? "-"}</TableCell>
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
