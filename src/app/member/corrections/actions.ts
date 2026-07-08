"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey } from "@/lib/attendance-time";

export async function createCorrectionAction(formData: FormData) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);

  const recordId = String(formData.get("recordId") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  let proposedCheckInTime = String(formData.get("proposedCheckInTime") ?? "") || null;

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

  if (newStatus === "ON_TIME" || newStatus === "LATE") {
    if (!proposedCheckInTime || !/^\d{2}:\d{2}$/.test(proposedCheckInTime)) {
      redirect("/member/corrections?error=missing-fields");
    }
  } else {
    proposedCheckInTime = null;
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

  // Validate time limit (2 to 7 days ago)
  const todayKey = getJakartaDateKey(new Date());
  const todayMidnight = new Date(`${todayKey}T00:00:00.000Z`);
  const recordDate = new Date(record.attendanceDate);
  const diffTime = todayMidnight.getTime() - recordDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 2 || diffDays > 7) {
    redirect("/member/corrections?error=out-of-range");
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
      proposedCheckInTime,
      reason,
      status: "PENDING",
    },
  });

  revalidatePath("/member/corrections");
  revalidatePath("/member/presensi/riwayat");
  redirect("/member/corrections?success=created");
}
