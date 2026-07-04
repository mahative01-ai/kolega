"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── WeeklyWorkRule upsert (bulk 7 hari per studio) ─────────────────────────

type DayRule = {
  dayOfWeek: number; // 0=Sun, 1=Mon, ... 6=Sat
  isWorkday: boolean;
  isOptional: boolean;
  workStartTime: string;
  workEndTime: string;
};

export async function upsertWeeklyWorkRulesAction(studioId: string, rules: DayRule[]) {
  await requireRole("SUPER_ADMIN");

  // Verify studio exists
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { id: true } });
  if (!studio) throw new Error("Studio tidak ditemukan.");

  await prisma.$transaction(
    rules.map((rule) =>
      prisma.weeklyWorkRule.upsert({
        where: { studioId_dayOfWeek: { studioId, dayOfWeek: rule.dayOfWeek } },
        create: {
          studioId,
          dayOfWeek: rule.dayOfWeek,
          isWorkday: rule.isWorkday,
          isOptional: rule.isOptional,
          workStartTime: rule.workStartTime,
          workEndTime: rule.workEndTime,
        },
        update: {
          isWorkday: rule.isWorkday,
          isOptional: rule.isOptional,
          workStartTime: rule.workStartTime,
          workEndTime: rule.workEndTime,
        },
      })
    )
  );

  // Also save weekStartDay to Studio
  revalidatePath("/settings");
  revalidatePath("/schedules");
}

// ─── Update Studio weekStartDay ──────────────────────────────────────────────

export async function updateStudioWeekStartAction(studioId: string, weekStartDay: number) {
  await requireRole("SUPER_ADMIN");
  await prisma.studio.update({ where: { id: studioId }, data: { weekStartDay } });
  revalidatePath("/settings");
}
