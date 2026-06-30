"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function reviewRequestAction(formData: FormData) {
  const reviewer = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);

  const requestId = String(formData.get("requestId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!requestId || !["APPROVE", "REJECT"].includes(action)) {
    redirect("/admin/requests?error=invalid-action");
  }

  // Fetch the request with user info
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          defaultStudioId: true,
        },
      },
    },
  });

  if (!request) {
    redirect("/admin/requests?error=not-found");
  }

  if (request.status !== "PENDING") {
    redirect("/admin/requests?error=already-reviewed");
  }

  // Scope check: Admin can only review requests from their own studio
  if (
    reviewer.role === "ADMIN" &&
    request.user.defaultStudioId !== reviewer.defaultStudioId
  ) {
    redirect("/admin/requests?error=unauthorized-studio");
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.$transaction(async (tx) => {
    // 1. Update the request status
    await tx.request.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewerId: reviewer.id,
        reviewedAt: new Date(),
      },
    });

    // 2. Audit log
    await tx.auditLog.create({
      data: {
        actorId: reviewer.id,
        entity: "Request",
        entityId: requestId,
        action: `REQUEST_${newStatus}`,
        metadata: {
          userId: request.userId,
          type: request.type,
          startDate: request.startDate,
          endDate: request.endDate,
        },
      },
    });

    // 3. If approved, materialize attendance records
    if (newStatus === "APPROVED") {
      const attendanceStatusMap = {
        PERMISSION: "PERMISSION" as const,
        SICK: "SICK" as const,
        LEAVE: "LEAVE" as const,
        ACCOUNT_ARCHIVE: "PERMISSION" as const, // Fallbacks, should not occur
        ACCOUNT_DEACTIVATION: "PERMISSION" as const,
      };

      const attendanceStatus = attendanceStatusMap[request.type];
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      // Loop through all dates in range (inclusive)
      const current = new Date(start);
      while (current <= end) {
        const attendanceDate = new Date(current);

        const studioId = request.user.defaultStudioId;
        if (!studioId) {
          throw new Error("User default studio is not configured.");
        }

        // Upsert attendance record
        await tx.attendanceRecord.upsert({
          where: {
            userId_attendanceDate: {
              userId: request.userId,
              attendanceDate,
            },
          },
          update: {
            status: attendanceStatus,
            checkInAt: null,
            checkOutAt: null,
            workMode: "WFO",
            locationValidationStatus: "NOT_REQUIRED",
            lateMinutes: 0,
            updatedAt: new Date(),
          },
          create: {
            userId: request.userId,
            attendanceDate,
            ownerStudioId: studioId,
            workMode: "WFO",
            status: attendanceStatus,
            locationValidationStatus: "NOT_REQUIRED",
            lateMinutes: 0,
            createdById: reviewer.id,
          },
        });

        // Move to next day in UTC
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }
  });

  revalidatePath("/admin/requests");
  revalidatePath("/member/requests");
  redirect(`/admin/requests?success=${action.toLowerCase()}`);
}
