"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateJournalAction(
  recordId: string,
  wfhPlan: string,
  wfhReport: string
) {
  const actor = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);

  // Fetch the attendance record to verify authorization
  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    select: { id: true, ownerStudioId: true },
  });

  if (!record) {
    throw new Error("Data presensi tidak ditemukan.");
  }

  // If Admin, check if record belongs to their studio
  if (actor.role === "ADMIN") {
    if (record.ownerStudioId !== actor.defaultStudioId) {
      throw new Error("Anda tidak memiliki izin untuk mengedit jurnal studio lain.");
    }
  }

  // Update the journal fields
  await prisma.attendanceRecord.update({
    where: { id: recordId },
    data: {
      wfhPlan: wfhPlan.trim() || null,
      wfhReport: wfhReport.trim() || null,
    },
  });

  revalidatePath("/laporan-presensi");
  return { success: true, message: "Jurnal berhasil diperbarui." };
}
