import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, Calendar, Clock, BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import { parseMonthKey, formatMonthLabel } from "@/lib/calendar";

export const dynamic = "force-dynamic";

function formatTime(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

// Generate range of recent months for filter dropdown
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(d);
    options.push({ key, label });
  }
  return options;
}

export default async function MemberLaporanWfhPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Admin and Member can access their own WFH reports
  if (user.role !== "MEMBER" && user.role !== "ADMIN") {
    redirect("/login");
  }

  const params = await searchParams;
  const monthKey = params.month || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const monthInfo = parseMonthKey(monthKey);
  // Get date range for target month
  const monthStart = new Date(Date.UTC(monthInfo.year, monthInfo.monthIndex, 1));
  const monthEnd = new Date(Date.UTC(monthInfo.year, monthInfo.monthIndex + 1, 0, 23, 59, 59, 999));

  // Query WFH attendance records
  const wfhRecords = await prisma.attendanceRecord.findMany({
    where: {
      userId: user.id,
      workMode: "WFH",
      attendanceDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: {
      attendanceDate: "desc",
    },
  });

  const monthOptions = getMonthOptions();

  return (
    <DashboardShell
      user={user}
      currentPath="/member/laporan-wfh"
      badge="Laporan WFH"
      title="Catatan Kerja WFH Saya"
      description="Rangkuman rencana kerja pagi dan laporan hasil kerja sore saat Anda bertugas WFH."
    >
      <div className="space-y-6">
        {/* Filter Section */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <Calendar className="size-4 text-blue-700 dark:text-blue-400" />
              Pilih Bulan Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form method="GET" className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5">
                <select
                  name="month"
                  defaultValue={monthKey}
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 px-3 text-sm focus:outline-none"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Tampilkan</Button>
            </form>
          </CardContent>
        </Card>

        {/* WFH Records List */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-base flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <Home className="size-5 text-blue-700 dark:text-blue-400" />
              Riwayat Jurnal Kerja WFH ({formatMonthLabel(monthInfo.year, monthInfo.monthIndex + 1)})
            </CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">
              Ditemukan {wfhRecords.length} hari kerja WFH pada bulan ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {wfhRecords.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="size-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Tidak ada riwayat WFH pada bulan ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {wfhRecords.map((record) => {
                  const hasCheckOut = !!record.checkOutAt;

                  return (
                    <div key={record.id} className="p-5 space-y-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                      {/* Date & Time Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatDate(record.attendanceDate)}
                          </span>
                          <Badge variant="outline" className="text-xs bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900">
                            WFH
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-zinc-400" />
                            In: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatTime(record.checkInAt)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-zinc-400" />
                            Out: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatTime(record.checkOutAt)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Content Columns: Plan vs Report */}
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* WFH Plan */}
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 p-3.5 space-y-1.5">
                          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                            <BookOpen className="size-3 text-zinc-400" />
                            RENCANA KERJA (PAGI)
                          </h4>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                            {record.wfhPlan || "Tidak menuliskan rencana kerja."}
                          </p>
                        </div>

                        {/* WFH Report */}
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 p-3.5 space-y-1.5">
                          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                            <CheckCircle className="size-3 text-zinc-400" />
                            HASIL KERJA (SORE)
                          </h4>
                          {hasCheckOut ? (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                              {record.wfhReport || "Tidak menuliskan laporan hasil kerja."}
                            </p>
                          ) : (
                            <div className="flex items-center gap-1.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded px-2.5 w-fit">
                              <AlertCircle className="size-3.5" />
                              Sedang Berjalan / Belum Check-out
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
