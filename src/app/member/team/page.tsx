import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { getMood, MOODS, MoodKey } from "@/lib/moods";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamMoodPage() {
  const currentUser = await requireUser();

  const users = await prisma.user.findMany({
    where: {
      accountStatus: "ACTIVE",
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      currentMood: true,
      moodNote: true,
      defaultStudio: {
        select: { name: true },
      },
    },
  });

  // Calculate stats
  const moodCounts = users.reduce((acc, u) => {
    const key = u.currentMood.toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sharingCount = users.filter((u) => u.currentMood !== "NEUTRAL" || !!u.moodNote).length;
  const totalCount = users.length;

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/team"
      badge="Kolega Mood"
      title="Suasana Hati Tim (Team Mood)"
      description="Lihat bagaimana suasana hati rekan kerja Anda hari ini di Mahative dan Kipa."
    >
      <div className="space-y-6">
        {/* Mood Stats Overview Bar */}
        <Card className="shadow-none border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
              <Smile className="size-4 text-blue-700 dark:text-blue-400" />
              Rekapitulasi Mood Hari Ini
            </CardTitle>
            <CardDescription className="text-xs">
              {sharingCount} dari {totalCount} rekan kerja membagikan suasana hatinya hari ini.
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
                <span>{sharingCount}/{totalCount} Sharing</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Mood Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {users.map((u) => {
            const mood = getMood(u.currentMood);
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
                      {u.defaultStudio?.name ?? "Studio tidak diset"}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Current Mood:</span>
                      <span className={`text-xs font-semibold px-2 py-0.2 rounded border ${mood.bgColor} ${mood.borderColor} ${mood.textColor}`}>
                        {mood.label}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-650 dark:text-zinc-350 italic bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60 min-h-[60px] flex items-center">
                      {u.moodNote ? `"${u.moodNote}"` : "Tidak ada pesan status."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
