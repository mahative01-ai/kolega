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
  let proposedCheckOutTime = String(formData.get("proposedCheckOutTime") ?? "") || null;

  // Validate fields
  const validStatuses = [
    "PRESENT",
    "ON_TIME",
    "LATE",
    "WFH",
    "PERMISSION",
    "SICK",
    "DISPENSATION",
    "LEAVE",
    "ALPHA",
  ];

  if (!recordId || !validStatuses.includes(newStatus) || !reason) {
    redirect("/member/corrections?error=missing-fields");
  }

  if (newStatus === "LEAVE" && currentUser.memberStatus === "INTERN") {
    redirect("/member/corrections?error=intern-leave");
  }

  const isPhysicalCorrection = newStatus === "ON_TIME" || newStatus === "LATE";

  if (isPhysicalCorrection) {
    if (!proposedCheckInTime || !/^\d{2}:\d{2}$/.test(proposedCheckInTime)) {
      redirect("/member/corrections?error=missing-fields");
    }

    if (proposedCheckOutTime && !/^\d{2}:\d{2}$/.test(proposedCheckOutTime)) {
      redirect("/member/corrections?error=missing-fields");
    }
  } else {
    proposedCheckInTime = null;
    proposedCheckOutTime = null;
  }

  // Handle optional file attachment (Base64 for serverless compatibility)
  const file = formData.get("attachment") as File | null;
  let attachmentUrl: string | null = null;

  if (file && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) {
      redirect("/member/corrections?error=file-size");
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      attachmentUrl = `data:${file.type};base64,${base64}`;
    } catch {
      redirect("/member/corrections?error=upload-failed");
    }
  }

  if (newStatus === "DISPENSATION" && !attachmentUrl) {
    redirect("/member/corrections?error=attachment-required");
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

  // Validate time limit (0 to 7 days ago)
  const todayKey = getJakartaDateKey(new Date());
  const todayMidnight = new Date(`${todayKey}T00:00:00.000Z`);
  const recordDate = new Date(record.attendanceDate);
  const diffTime = todayMidnight.getTime() - recordDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0 || diffDays > 7) {
    redirect("/member/corrections?error=out-of-range");
  }

  if (isPhysicalCorrection && diffDays > 0 && !proposedCheckOutTime) {
    redirect("/member/corrections?error=missing-checkout");
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
      proposedCheckOutTime,
      reason,
      attachmentUrl,
      status: "PENDING",
    },
  });

  revalidatePath("/member/corrections");
  revalidatePath("/member/presensi/riwayat");
  redirect("/member/corrections?success=created");
}

export async function cancelCorrectionAction(formData: FormData) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const correctionId = String(formData.get("correctionId") ?? "");

  const correction = await prisma.attendanceCorrection.findUnique({
    where: { id: correctionId },
  });

  if (!correction) {
    redirect("/member/corrections?error=not-found");
  }

  if (correction.requestedById !== currentUser.id) {
    redirect("/member/corrections?error=unauthorized");
  }

  if (correction.status !== "PENDING") {
    redirect("/member/corrections?error=already-processed");
  }

  await prisma.attendanceCorrection.delete({
    where: { id: correctionId },
  });

  revalidatePath("/member/corrections");
  revalidatePath("/member/presensi/riwayat");
  redirect("/member/corrections?success=cancelled");
}
