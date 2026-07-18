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

export async function createOwnJournalAction(
  dateStr: string,
  workMode: "WFO" | "WFH",
  wfhPlan: string,
  wfhReport: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Anda harus login terlebih dahulu.");
  }

  const attendanceDate = new Date(dateStr);
  attendanceDate.setHours(0, 0, 0, 0);

  // Check if a record already exists for this date
  const existingRecord = await prisma.attendanceRecord.findFirst({
    where: {
      userId: currentUser.id,
      attendanceDate,
    },
  });

  if (existingRecord) {
    // If it exists, update it
    await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: {
        wfhPlan: workMode === "WFH" ? (wfhPlan.trim() || null) : null,
        wfhReport: wfhReport.trim() || null,
      },
    });
  } else {
    // Fetch owner studio from defaultStudioId
    const defaultStudio = await prisma.studio.findFirst({
      where: { id: currentUser.defaultStudioId || "__none__" },
    });

    // If it doesn't exist, create a new record
    await prisma.attendanceRecord.create({
      data: {
        userId: currentUser.id,
        attendanceDate,
        ownerStudioId: defaultStudio?.id ?? currentUser.defaultStudioId ?? "__none__",
        workMode,
        status: "PRESENT", // default to present since they submitted a journal
        wfhPlan: workMode === "WFH" ? (wfhPlan.trim() || null) : null,
        wfhReport: wfhReport.trim() || null,
        locationValidationStatus: "NOT_REQUIRED",
      },
    });
  }

  revalidatePath("/member/laporan-wfh");
  revalidatePath("/laporan-presensi");
  return { success: true, message: "Jurnal berhasil disimpan." };
}

export async function deleteOwnJournalAction(recordId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Anda harus login terlebih dahulu.");
  }

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    select: { id: true, userId: true },
  });

  if (!record) {
    throw new Error("Data presensi tidak ditemukan.");
  }

  if (record.userId !== currentUser.id) {
    throw new Error("Anda hanya diperbolehkan menghapus jurnal Anda sendiri.");
  }

  // Clear journal fields
  await prisma.attendanceRecord.update({
    where: { id: recordId },
    data: {
      wfhPlan: null,
      wfhReport: null,
    },
  });

  revalidatePath("/member/laporan-wfh");
  revalidatePath("/laporan-presensi");
  return { success: true, message: "Jurnal berhasil dihapus." };
}
