"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createCorrectionAction(formData: FormData) {
  const currentUser = await requireRole("MEMBER");

  const recordId = String(formData.get("recordId") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  // Validate fields
  const validStatuses = [
    "PRESENT",
    "ON_TIME",
    "LATE",
    "WFH",
    "PERMISSION",
    "SICK",
    "LEAVE",
    "ALPHA",
  ];

  if (!recordId || !validStatuses.includes(newStatus) || !reason) {
    redirect("/member/corrections?error=missing-fields");
  }

  // Fetch the attendance record
  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
  });

  if (!record) {
    redirect("/member/corrections?error=not-found");
  }

  // Validate ownership
  if (record.userId !== currentUser.id) {
    redirect("/member/corrections?error=unauthorized");
  }

  // Check for existing pending corrections for this record
  const existingPending = await prisma.attendanceCorrection.findFirst({
    where: {
      attendanceRecordId: recordId,
      status: "PENDING",
    },
  });

  if (existingPending) {
    redirect("/member/corrections?error=already-pending");
  }

  // Create correction request
  await prisma.attendanceCorrection.create({
    data: {
      attendanceRecordId: recordId,
      requestedById: currentUser.id,
      previousStatus: record.status,
      newStatus: newStatus as typeof record.status,
      reason,
      status: "PENDING",
    },
  });

  revalidatePath("/member/corrections");
  revalidatePath("/member/presensi/riwayat");
  redirect("/member/corrections?success=created");
}
