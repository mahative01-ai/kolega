"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateOwnJournalAction(
  recordId: string,
  wfhPlan: string,
  wfhReport: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Anda harus login terlebih dahulu.");
  }

  // Fetch the attendance record
  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    select: { id: true, userId: true },
  });

  if (!record) {
    throw new Error("Data presensi tidak ditemukan.");
  }

  // Check if it belongs to the logged-in user
  if (record.userId !== currentUser.id) {
    throw new Error("Anda hanya diperbolehkan mengedit jurnal Anda sendiri.");
  }

  // Update the journal fields
  await prisma.attendanceRecord.update({
    where: { id: recordId },
    data: {
      wfhPlan: wfhPlan.trim() || null,
      wfhReport: wfhReport.trim() || null,
    },
  });

  revalidatePath("/member/laporan-wfh");
  revalidatePath("/laporan-presensi");
  return { success: true, message: "Jurnal berhasil diperbarui." };
}
