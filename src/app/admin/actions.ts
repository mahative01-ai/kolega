"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Broadcast Announcement to all active studio members ──────────────────────

export async function broadcastAnnouncementAction(message: string) {
  const sender = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const studioId = sender.defaultStudioId;
  if (!studioId) {
    throw new Error("Anda tidak terikat ke studio manapun.");
  }

  const msg = message.trim();
  if (!msg) {
    throw new Error("Pesan pengumuman tidak boleh kosong.");
  }

  // Find all active users of this studio (default studio or active placements)
  const users = await prisma.user.findMany({
    where: {
      accountStatus: "ACTIVE",
      OR: [
        { defaultStudioId: studioId },
        { placements: { some: { studioId, status: "ACTIVE" } } },
      ],
    },
    select: { id: true },
  });

  // Create notifications for all of them
  await prisma.$transaction(
    users.map((u) =>
      prisma.notification.create({
        data: {
          userId: u.id,
          title: `[PENGUMUMAN] ${sender.name}`,
          message: msg,
        },
      })
    )
  );

  revalidatePath("/member");
  revalidatePath("/admin");
  return { success: true, message: "Pengumuman berhasil disebarkan ke semua anggota." };
}

// ─── Picket Duty Quick Assignment ───────────────────────────────────────────

export async function quickAssignPicketAction(userId: string, dateStr: string) {
  const actor = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const studioId = actor.defaultStudioId;
  if (!studioId) {
    throw new Error("Anda tidak terikat ke studio manapun.");
  }

  const picketDate = new Date(dateStr);
  picketDate.setHours(0, 0, 0, 0);

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, defaultStudioId: true },
  });
  if (!targetUser) {
    throw new Error("Anggota tidak ditemukan.");
  }

  // Upsert picket schedule
  try {
    await prisma.picketSchedule.upsert({
      where: { userId_picketDate: { userId, picketDate } },
      create: {
        userId,
        studioId,
        picketDate,
        note: "Ditugaskan cepat dari Dasbor",
      },
      update: {
        studioId,
        note: "Ditugaskan cepat dari Dasbor",
      },
    });
  } catch (err: any) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      throw new Error("Staf ini sudah memiliki jadwal piket pada tanggal tersebut.");
    }
    throw err;
  }

  revalidatePath("/admin");
  revalidatePath("/piket");
  return { success: true, message: "Petugas piket berhasil ditambahkan." };
}

// ─── Picket Duty Quick Removal ──────────────────────────────────────────────

export async function quickRemovePicketAction(picketId: string) {
  const actor = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);

  const picket = await prisma.picketSchedule.findUnique({
    where: { id: picketId },
    select: { id: true, studioId: true },
  });
  if (!picket) {
    throw new Error("Jadwal piket tidak ditemukan.");
  }

  // Scope check: Admin can only delete pickets from their own studio
  const isGlobalSuperAdmin = actor.role === "SUPER_ADMIN" && actor.defaultStudioId === null;
  if (!isGlobalSuperAdmin && picket.studioId !== actor.defaultStudioId) {
    throw new Error("Anda hanya diperbolehkan menghapus piket studio Anda sendiri.");
  }

  await prisma.picketSchedule.delete({
    where: { id: picketId },
  });

  revalidatePath("/admin");
  revalidatePath("/piket");
  return { success: true, message: "Petugas piket berhasil dihapus." };
}
