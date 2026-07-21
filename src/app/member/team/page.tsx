import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { dateOnlyFromKey, getJakartaDateKey } from "@/lib/attendance-time";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { getMood, MOODS } from "@/lib/moods";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Clock, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DailySignalsBanner } from "@/components/daily-signals-banner";
import { getDailySignals } from "@/lib/daily-signals";

export const dynamic = "force-dynamic";

export default async function TeamMoodPage() {
  const currentUser = await requireUser();

  const todayKey = getJakartaDateKey(new Date());
  const todayDate = dateOnlyFromKey(todayKey);

  const whereClause: Prisma.UserWhereInput = {
    accountStatus: "ACTIVE",
  };

  if (currentUser.role !== "SUPER_ADMIN" && currentUser.defaultStudioId) {
    whereClause.defaultStudioId = currentUser.defaultStudioId;
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      defaultStudio: {
        select: { name: true },
      },
      attendanceRecords: {
        where: {
          attendanceDate: todayDate,
        },
        select: {
          mood: true,
          moodNote: true,
          workMode: true,
          status: true,
          checkInAt: true,
        },
      },
    },
  });

  const usersWithAttendance = users.map((u) => {
    const todayAtt = u.attendanceRecords[0] ?? null;
    return {
      ...u,
      todayAttendance: todayAtt,
    };
  });

  const checkedInUsers = usersWithAttendance.filter(
    (u) => u.todayAttendance && (u.todayAttendance.checkInAt || u.todayAttendance.status === "WFH")
  );

  const sharedMoodUsers = checkedInUsers.filter(
    (u) => u.todayAttendance?.mood && u.todayAttendance.mood.trim() !== ""
  );

  const pendingMoodUsers = checkedInUsers.filter(
    (u) => !u.todayAttendance?.mood || u.todayAttendance.mood.trim() === ""
  );

  const notCheckedInUsers = usersWithAttendance.filter(
    (u) => !u.todayAttendance || (!u.todayAttendance.checkInAt && u.todayAttendance.status !== "WFH")
  );

  // Calculate mood stats from today's attendance records
  const moodCounts = sharedMoodUsers.reduce((acc, u) => {
    const key = (u.todayAttendance?.mood ?? "NEUTRAL").toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sharingCount = sharedMoodUsers.length;
  const totalCount = users.length;

  const dailySignals = await getDailySignals({
    id: currentUser.id,
    role: currentUser.role,
    defaultStudioId: currentUser.defaultStudioId,
  });

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/team"
      badge="Kolega Mood"
      title="Team Mood"
      description="Lihat mood dan kondisi presensi rekan kerja Anda hari ini berdasarkan data presensi harian."
    >
      <div className="space-y-6">
        <DailySignalsBanner signals={dailySignals} currentUserId={currentUser.id} />
        {/* Mood Stats Overview Bar */}
        <Card className="shadow-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
              <Smile className="size-4 text-blue-700 dark:text-blue-400" />
              Overview Mood Hari Ini
            </CardTitle>
            <CardDescription className="text-xs">
              {sharingCount} dari {totalCount} rekan kerja membagikan mood presensi hari ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => {
                const count = moodCounts[m.key] || 0;
                if (count === 0) return null;
                return (
                  <div
                    key={m.key}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${m.bgColor} ${m.borderColor} ${m.textColor}`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                    <span className="bg-white/60 dark:bg-zinc-950/40 px-1.5 py-0.2 rounded-full text-[10px]">
                      {count}
                    </span>
                  </div>
                );
              })}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400">
                <span>📢</span>
                <span>{sharingCount}/{totalCount} Shared</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section: Shared Mood Today */}
        {sharedMoodUsers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Smile className="size-4 text-emerald-600" />
              Mood Rekan Kerja Hari Ini ({sharedMoodUsers.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sharedMoodUsers.map((u) => {
                const mood = getMood(u.todayAttendance?.mood);
                return (
                  <Card key={u.id} className="shadow-none border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-all flex flex-col justify-between">
                    <CardHeader className="p-4 pb-3 flex flex-row items-center gap-3">
                      {/* Circle Mood Avatar */}
                      <div className={`size-12 rounded-full flex items-center justify-center text-2xl shrink-0 border select-none ${mood.bgColor} ${mood.borderColor}`}>
                        {mood.emoji}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 truncate" title={u.name}>
                          {u.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {u.defaultStudio?.name ?? "No studio assigned"}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Mood:</span>
                            <span className={`text-xs font-semibold px-2 py-0.2 rounded border ${mood.bgColor} ${mood.borderColor} ${mood.textColor}`}>
                              {mood.label}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {u.todayAttendance?.workMode}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-650 dark:text-zinc-350 italic bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60 min-h-[60px] flex items-center">
                          {u.todayAttendance?.moodNote ? `"${u.todayAttendance.moodNote}"` : "No status message."}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Section: Checked In but Mood Not Shared Yet */}
        {pendingMoodUsers.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              Sudah Presensi, belum membagikan mood ({pendingMoodUsers.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pendingMoodUsers.map((u) => (
                <Card key={u.id} className="shadow-none border border-zinc-200 dark:border-zinc-800 opacity-80">
                  <CardHeader className="p-4 pb-3 flex flex-row items-center gap-3">
                    <div className="size-10 rounded-full flex items-center justify-center text-lg shrink-0 border bg-zinc-100 dark:bg-zinc-800 text-zinc-400 select-none">
                      👤
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 truncate" title={u.name}>
                        {u.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {u.defaultStudio?.name ?? "No studio assigned"}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <span className="text-xs text-zinc-400 italic">Not shared yet</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Section: Not Checked In Yet */}
        {notCheckedInUsers.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <UserX className="size-4" />
              Belum Melakukan Presensi Hari Ini ({notCheckedInUsers.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {notCheckedInUsers.map((u) => (
                <div key={u.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{u.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{u.defaultStudio?.name}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] text-zinc-400 border-zinc-200 dark:border-zinc-800">
                    Not checked in
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
