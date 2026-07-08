"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateKey } from "@/lib/calendar";

export async function setWfhScheduleAction(userId: string, workDateKey: string) {
  const actor = await requireRole("SUPER_ADMIN");

  if (!userId || !workDateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error("Data jadwal tidak lengkap.");
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      accountStatus: "ACTIVE",
      role: {
        not: "SUPER_ADMIN",
      },
    },
    select: {
      id: true,
      defaultStudioId: true,
      placements: {
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          studioId: true,
        },
      },
    },
  });

  if (!targetUser) {
    throw new Error("User tidak ditemukan atau tidak aktif.");
  }

  if (actor.defaultStudioId) {
    const isMemberInStudio = targetUser.defaultStudioId === actor.defaultStudioId || 
                             targetUser.placements.some(p => p.studioId === actor.defaultStudioId);
    if (!isMemberInStudio) {
      throw new Error("Anda hanya diperbolehkan mengatur jadwal untuk anggota studio Anda sendiri.");
    }
  }

  const workDate = parseDateKey(workDateKey);
  const studioId = targetUser.placements[0]?.studioId ?? targetUser.defaultStudioId;

  await prisma.$transaction([
    prisma.personalWorkSchedule.upsert({
      where: {
        userId_workDate: {
          userId,
          workDate,
        },
      },
      update: {
        workMode: "WFH",
        studioId,
        note: "WFH diatur oleh Super Admin",
        createdById: actor.id,
      },
      create: {
        userId,
        workDate,
        workMode: "WFH",
        studioId,
        note: "WFH diatur oleh Super Admin",
        createdById: actor.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "PersonalWorkSchedule",
        entityId: userId,
        action: "WORK_SCHEDULE_SET_WFH",
        metadata: { userId, workDate: workDateKey },
      },
    }),
  ]);

  revalidatePath("/schedules");
}

export async function resetWfoScheduleAction(userId: string, workDateKey: string) {
  const actor = await requireRole("SUPER_ADMIN");

  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      accountStatus: "ACTIVE",
      role: {
        not: "SUPER_ADMIN",
      },
    },
    select: {
      id: true,
      defaultStudioId: true,
      placements: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { studioId: true }
      }
    }
  });

  if (!targetUser) {
    throw new Error("User tidak ditemukan atau tidak aktif.");
  }

  if (actor.defaultStudioId) {
    const isMemberInStudio = targetUser.defaultStudioId === actor.defaultStudioId || 
                             targetUser.placements.some(p => p.studioId === actor.defaultStudioId);
    if (!isMemberInStudio) {
      throw new Error("Anda hanya diperbolehkan mengatur jadwal untuk anggota studio Anda sendiri.");
    }
  }

  const workDate = parseDateKey(workDateKey);

  await prisma.$transaction([
    prisma.personalWorkSchedule.deleteMany({
      where: {
        userId,
        workDate,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "PersonalWorkSchedule",
        entityId: userId,
        action: "WORK_SCHEDULE_RESET_WFO",
        metadata: { userId, workDate: workDateKey },
      },
    }),
  ]);

  revalidatePath("/schedules");
}
