"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, getJakartaMinutes } from "@/lib/attendance-time";

export async function createRequestAction(formData: FormData) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);

  const requestedType = String(formData.get("type") ?? "");
  const startDateStr = String(formData.get("startDate") ?? "");
  const endDateStr = String(formData.get("endDate") ?? "");
  const replacementDateStr = String(formData.get("replacementDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  // Validate fields
  if (!["PERMISSION", "SICK", "DISPENSATION", "LEAVE", "WFH"].includes(requestedType)) {
    redirect("/member/requests?error=invalid-type");
  }

  if (!startDateStr || !endDateStr || !reason) {
    redirect("/member/requests?error=missing-fields");
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    redirect("/member/requests?error=invalid-dates");
  }

  if (startDate > endDate) {
    redirect("/member/requests?error=date-range");
  }

  // Check for duplicate/overlapping requests (PENDING or APPROVED)
  const overlappingRequest = await prisma.request.findFirst({
    where: {
      userId: currentUser.id,
      status: { in: ["PENDING", "APPROVED"] },
      type: { in: ["PERMISSION", "SICK", "DISPENSATION", "LEAVE", "WFH"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true },
  });

  if (overlappingRequest) {
    redirect("/member/requests?error=overlapping-request");
  }

  // 1. Dapatkan tanggal Jakarta hari ini dan besok
  const todayKey = getJakartaDateKey(new Date());
  const todayDate = new Date(`${todayKey}T00:00:00.000Z`);
  const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);

  const startDateTime = new Date(`${startDateStr}T00:00:00.000Z`);

  // 2. Blokir tanggal di masa lampau (hari sebelum hari ini)
  if (startDateTime < todayDate) {
    redirect("/member/requests?error=past-date");
  }

  // 3. Validasi izin/cuti: minimal H-1.
  if ((requestedType === "PERMISSION" || requestedType === "LEAVE") && startDateTime < tomorrowDate) {
    redirect("/member/requests?error=leave-notice");
  }

  let replacementDate: Date | null = null;
  if (replacementDateStr) {
    replacementDate = new Date(replacementDateStr);
    if (isNaN(replacementDate.getTime())) {
      redirect("/member/requests?error=invalid-dates");
    }
    if (replacementDate <= endDate) {
      redirect("/member/requests?error=replacement-date");
    }
  }

  // 4. Validasi Sakit (SICK): maksimal 1 jam sebelum jam masuk jika diajukan hari H
  if (requestedType === "SICK" && startDateTime.getTime() === todayDate.getTime()) {
    const currentMinutes = getJakartaMinutes(new Date());
    // Batas 07:00 pagi adalah 7 * 60 = 420 menit
    if (currentMinutes >= 420) {
      redirect("/member/requests?error=sick-notice");
    }
  }

  // 5. Validasi WFH: Status Intern tidak boleh mengajukan WFH
  if (requestedType === "WFH" && currentUser.memberStatus === "INTERN") {
    redirect("/member/requests?error=intern-wfh");
  }

  if (requestedType === "LEAVE" && currentUser.memberStatus === "INTERN") {
    redirect("/member/requests?error=intern-leave");
  }

  // Handle optional file attachment (Base64 for serverless compatibility)
  const file = formData.get("attachment") as File | null;
  let attachmentUrl: string | null = null;

  if (file && file.size > 0) {
    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      redirect("/member/requests?error=file-size");
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      attachmentUrl = `data:${file.type};base64,${base64}`;
    } catch {
      redirect("/member/requests?error=upload-failed");
    }
  }

  let type = requestedType as "PERMISSION" | "SICK" | "DISPENSATION" | "LEAVE" | "WFH";
  if (requestedType === "SICK" && !attachmentUrl) {
    type = "PERMISSION";
  }

  if (requestedType === "DISPENSATION" && !attachmentUrl) {
    redirect("/member/requests?error=attachment-required");
  }

  // Create request in database
  await prisma.request.create({
    data: {
      userId: currentUser.id,
      type,
      status: "PENDING",
      startDate,
      endDate,
      replacementDate,
      reason,
      attachmentUrl,
    },
  });

  revalidatePath("/member/requests");
  redirect("/member/requests?success=created");
}

export async function cancelRequestAction(formData: FormData) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const requestId = String(formData.get("requestId") ?? "");

  const request = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    redirect("/member/requests?error=not-found");
  }

  if (request.userId !== currentUser.id) {
    redirect("/member/requests?error=unauthorized");
  }

  if (request.status !== "PENDING") {
    redirect("/member/requests?error=already-processed");
  }

  await prisma.request.delete({
    where: { id: requestId },
  });

  revalidatePath("/member/requests");
  redirect("/member/requests?success=cancelled");
}
