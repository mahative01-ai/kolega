"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createRequestAction(formData: FormData) {
  const currentUser = await requireRole("MEMBER");

  const type = String(formData.get("type") ?? "");
  const startDateStr = String(formData.get("startDate") ?? "");
  const endDateStr = String(formData.get("endDate") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  // Validate fields
  if (!["PERMISSION", "SICK", "LEAVE"].includes(type)) {
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

  // Create request in database
  await prisma.request.create({
    data: {
      userId: currentUser.id,
      type: type as "PERMISSION" | "SICK" | "LEAVE",
      status: "PENDING",
      startDate,
      endDate,
      reason,
      attachmentUrl,
    },
  });

  revalidatePath("/member/requests");
  redirect("/member/requests?success=created");
}
