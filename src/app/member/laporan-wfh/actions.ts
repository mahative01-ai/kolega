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
    throw new Error("You must be logged in.");
  }

  // Fetch the attendance record
  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    select: { id: true, userId: true, status: true },
  });

  if (!record) {
    throw new Error("Attendance record not found.");
  }

  // Check if it belongs to the logged-in user
  if (record.userId !== currentUser.id) {
    throw new Error("You can only edit your own journal.");
  }

  // Prevent journal edit if status is non-working
  if (["ALPHA", "SICK", "LEAVE", "PERMISSION"].includes(record.status)) {
    throw new Error("You cannot edit a journal for days recorded as absent (Alpha/Sick/Leave/Permission).");
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
  return { success: true, message: "Journal updated successfully." };
}

export async function createOwnJournalAction(
  dateStr: string,
  wfhPlan: string,
  wfhReport: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("You must be logged in.");
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
    // Prevent journal edit if status is non-working
    if (["ALPHA", "SICK", "LEAVE", "PERMISSION"].includes(existingRecord.status)) {
      throw new Error("You cannot edit/create a journal for days recorded as absent (Alpha/Sick/Leave/Permission).");
    }

    // If it exists, update it using its existing workMode
    await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: {
        wfhPlan: existingRecord.workMode === "WFH" ? (wfhPlan.trim() || null) : null,
        wfhReport: wfhReport.trim() || null,
      },
    });
  } else {
    // If no record exists, fetch personal schedule to determine workMode
    const personalSchedule = await prisma.personalWorkSchedule.findUnique({
      where: {
        userId_workDate: {
          userId: currentUser.id,
          workDate: attendanceDate,
        },
      },
      select: { workMode: true },
    });

    const workMode = personalSchedule?.workMode ?? "WFO";

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
  return { success: true, message: "Journal saved successfully." };
}

export async function deleteOwnJournalAction(recordId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("You must be logged in.");
  }

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    select: { id: true, userId: true },
  });

  if (!record) {
    throw new Error("Attendance record not found.");
  }

  if (record.userId !== currentUser.id) {
    throw new Error("You can only delete your own journal.");
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
  return { success: true, message: "Journal deleted successfully." };
}
