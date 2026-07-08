"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PicketInput = {
  userId: string;
  studioId: string;
  picketDate: string; // "YYYY-MM-DD"
  note?: string | null;
};

function parseDate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

export async function assignPicketAction(input: PicketInput) {
  const actor = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);

  // Validasi: Pastikan admin/owner hanya bisa assign di studionya sendiri
  if (actor.defaultStudioId && actor.defaultStudioId !== input.studioId) {
    throw new Error("Anda hanya dapat menugaskan piket untuk studio asal Anda.");
  }

  const picketDate = parseDate(input.picketDate);

  const existing = await prisma.picketSchedule.findUnique({
    where: {
      userId_picketDate: {
        userId: input.userId,
        picketDate,
      },
    },
  });

  if (existing) {
    throw new Error("Anggota sudah ditugaskan piket di tanggal ini.");
  }

  const picket = await prisma.picketSchedule.create({
    data: {
      userId: input.userId,
      studioId: input.studioId,
      picketDate,
      note: input.note?.trim() || null,
    },
    include: {
      user: { select: { name: true } },
      studio: { select: { name: true } },
    },
  });

  // Buat Notifikasi Instan di Aplikasi untuk User
  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: "Tugas Piket Baru",
      message: `Anda ditugaskan piket di ${picket.studio.name} pada tanggal ${input.picketDate}.`,
    },
  });

  // Catat Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "PicketSchedule",
      entityId: picket.id,
      action: "PICKET_ASSIGNED",
      metadata: {
        targetUserId: input.userId,
        targetUserName: picket.user.name,
        picketDate: input.picketDate,
        studioName: picket.studio.name,
      },
    },
  });

  revalidatePath("/piket");
  return { success: true };
}

export async function deletePicketAction(id: string) {
  const actor = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);

  const picket = await prisma.picketSchedule.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      studio: { select: { id: true, name: true } },
    },
  });

  if (!picket) {
    throw new Error("Jadwal piket tidak ditemukan.");
  }

  // Validasi: Pastikan admin/owner hanya bisa delete di studionya sendiri
  if (actor.defaultStudioId && actor.defaultStudioId !== picket.studioId) {
    throw new Error("Anda hanya dapat menghapus piket di studio asal Anda.");
  }

  await prisma.picketSchedule.delete({ where: { id } });

  // Buat Notifikasi Pembatalan
  await prisma.notification.create({
    data: {
      userId: picket.userId,
      title: "Tugas Piket Dibatalkan",
      message: `Tugas piket Anda di ${picket.studio.name} pada tanggal ${picket.picketDate.toISOString().slice(0, 10)} telah dibatalkan.`,
    },
  });

  // Catat Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      entity: "PicketSchedule",
      entityId: id,
      action: "PICKET_DELETED",
      metadata: {
        targetUserId: picket.userId,
        targetUserName: picket.user.name,
        picketDate: picket.picketDate.toISOString().slice(0, 10),
        studioName: picket.studio.name,
      },
    },
  });

  revalidatePath("/piket");
  return { success: true };
}
