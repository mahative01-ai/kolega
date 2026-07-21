import { redirect } from "next/navigation";
import { getDashboardPath, requireUser } from "@/lib/auth";
import { dateOnlyFromKey, getJakartaDateKey } from "@/lib/attendance-time";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { MoodClient } from "./mood-client";

export const dynamic = "force-dynamic";

export default async function MemberMoodPage() {
  const currentUser = await requireUser();

  const todayKey = getJakartaDateKey(new Date());
  const todayDate = dateOnlyFromKey(todayKey);

  const todayRecord = await prisma.attendanceRecord.findUnique({
    where: {
      userId_attendanceDate: {
        userId: currentUser.id,
        attendanceDate: todayDate,
      },
    },
    select: {
      id: true,
      mood: true,
      moodNote: true,
      checkInAt: true,
      workMode: true,
      wfhPlan: true,
    },
  });

  // Validasi: User harus punya attendance record untuk tanggal hari ini yang sudah check-in / submit plan
  if (!todayRecord || (!todayRecord.checkInAt && !todayRecord.wfhPlan)) {
    redirect("/member/presensi");
  }

  const dashboardPath = getDashboardPath(currentUser.role);

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/mood"
      badge="Daily Mood"
      title="Set Daily Mood"
      description="Update your mood and focus area for today after attendance."
    >
      <div className="py-4">
        <MoodClient
          initialMood={todayRecord.mood}
          initialMoodNote={todayRecord.moodNote}
          dashboardPath={dashboardPath}
        />
      </div>
    </DashboardShell>
  );
}
