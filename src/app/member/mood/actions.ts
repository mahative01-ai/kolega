"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { dateOnlyFromKey, getJakartaDateKey } from "@/lib/attendance-time";
import { isValidMoodKey } from "@/lib/moods";
import { prisma } from "@/lib/prisma";

export async function submitAttendanceMoodAction(formData: FormData) {
  const currentUser = await requireUser();
  const rawMood = String(formData.get("mood") ?? formData.get("currentMood") ?? "").trim().toUpperCase();
  const moodNote = String(formData.get("moodNote") ?? "").trim().slice(0, 280) || null;

  if (!rawMood || !isValidMoodKey(rawMood)) {
    throw new Error("Pilihan mood tidak valid.");
  }

  const todayKey = getJakartaDateKey(new Date());
  const todayDate = dateOnlyFromKey(todayKey);

  const todayRecord = await prisma.attendanceRecord.findUnique({
    where: {
      userId_attendanceDate: {
        userId: currentUser.id,
        attendanceDate: todayDate,
      },
    },
  });

  if (!todayRecord) {
    throw new Error("Anda belum melakukan presensi hari ini.");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.attendanceRecord.update({
      where: { id: todayRecord.id },
      data: {
        mood: rawMood,
        moodNote,
        moodSubmittedAt: now,
      },
    }),
    prisma.user.update({
      where: { id: currentUser.id },
      data: {
        currentMood: rawMood,
        moodNote,
      },
    }),
  ]);

  revalidatePath("/member");
  revalidatePath("/admin");
  revalidatePath("/super-admin");
  revalidatePath("/member/team");
  revalidatePath("/laporan-presensi");
  revalidatePath("/member/presensi/riwayat");
  revalidatePath("/settings");
  revalidatePath("/member/mood");
}
