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
          role: true,
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

  // Scope check: Admin can only review requests from their own studio or if they are receiving placement
  const activePlacement = await prisma.placement.findFirst({
    where: {
      userId: request.userId,
      studioId: reviewer.defaultStudioId ?? "__none__",
      status: "ACTIVE",
    },
    select: { id: true },
  });
  const isAuthorized = request.user.defaultStudioId === reviewer.defaultStudioId || !!activePlacement;

  if (reviewer.role === "ADMIN" && !isAuthorized) {
    redirect("/admin/requests?error=unauthorized-studio");
  }

  // Admin cannot review requests from other Admins or Super Admins
  if (reviewer.role === "ADMIN" && (request.user.role === "ADMIN" || request.user.role === "SUPER_ADMIN")) {
    redirect("/admin/requests?error=unauthorized-admin-review");
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

    // 3. If approved, materialize attendance records or schedules
    if (newStatus === "APPROVED") {
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

        if (request.type === "WFH") {
          // Materialize PersonalWorkSchedule WFH
          await tx.personalWorkSchedule.upsert({
            where: {
              userId_workDate: {
                userId: request.userId,
                workDate: attendanceDate,
              },
            },
            update: {
              workMode: "WFH",
              updatedAt: new Date(),
            },
            create: {
              userId: request.userId,
              workDate: attendanceDate,
              workMode: "WFH",
            },
          });
        } else {
          // Materialize AttendanceRecord for SICK, LEAVE, PERMISSION
          const attendanceStatusMap = {
            PERMISSION: "PERMISSION" as const,
            SICK: "SICK" as const,
            LEAVE: "LEAVE" as const,
            ACCOUNT_ARCHIVE: "PERMISSION" as const,
            ACCOUNT_DEACTIVATION: "PERMISSION" as const,
          };
          const attendanceStatus =
            attendanceStatusMap[request.type as keyof typeof attendanceStatusMap] || "PERMISSION";

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
        }

        // Move to next day in UTC
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }
  });

  revalidatePath("/admin/requests");
  revalidatePath("/member/requests");
  redirect(`/admin/requests?success=${action.toLowerCase()}`);
}

// ─── Async Quick Review Action ──────────────────────────────────────────────

export async function quickReviewRequestAction(requestId: string, approve: boolean) {
  const reviewer = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const action = approve ? "APPROVE" : "REJECT";

  if (!requestId) {
    throw new Error("ID Pengajuan tidak valid.");
  }

  // Fetch the request with user info
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          defaultStudioId: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error("Pengajuan tidak ditemukan.");
  }

  if (request.status !== "PENDING") {
    throw new Error("Pengajuan sudah diproses sebelumnya.");
  }

  // Scope check: Admin can only review requests from their own studio or if they are receiving placement
  const activePlacement = await prisma.placement.findFirst({
    where: {
      userId: request.userId,
      studioId: reviewer.defaultStudioId ?? "__none__",
      status: "ACTIVE",
    },
    select: { id: true },
  });
  const isAuthorized = request.user.defaultStudioId === reviewer.defaultStudioId || !!activePlacement;

  if (reviewer.role === "ADMIN" && !isAuthorized) {
    throw new Error("Anda tidak memiliki akses ke studio ini.");
  }

  // Admin cannot review requests from other Admins or Super Admins
  if (reviewer.role === "ADMIN" && (request.user.role === "ADMIN" || request.user.role === "SUPER_ADMIN")) {
    throw new Error("Anda tidak memiliki wewenang memproses pengajuan admin lain.");
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

    // 3. If approved, materialize attendance records or schedules
    if (newStatus === "APPROVED") {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      // Loop through all dates in range (inclusive)
      const current = new Date(start);
      while (current <= end) {
        const attendanceDate = new Date(current);

        const studioId = request.user.defaultStudioId;
        if (!studioId) {
          throw new Error("Studio asal anggota belum dikonfigurasi.");
        }

        if (request.type === "WFH") {
          // Materialize PersonalWorkSchedule WFH
          await tx.personalWorkSchedule.upsert({
            where: {
              userId_workDate: {
                userId: request.userId,
                workDate: attendanceDate,
              },
            },
            update: {
              workMode: "WFH",
              updatedAt: new Date(),
            },
            create: {
              userId: request.userId,
              workDate: attendanceDate,
              workMode: "WFH",
            },
          });
        } else {
          // Materialize AttendanceRecord for SICK, LEAVE, PERMISSION
          const attendanceStatusMap = {
            PERMISSION: "PERMISSION" as const,
            SICK: "SICK" as const,
            LEAVE: "LEAVE" as const,
            ACCOUNT_ARCHIVE: "PERMISSION" as const,
            ACCOUNT_DEACTIVATION: "PERMISSION" as const,
          };
          const attendanceStatus =
            attendanceStatusMap[request.type as keyof typeof attendanceStatusMap] || "PERMISSION";

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
        }

        // Move to next day in UTC
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }
  });

  revalidatePath("/admin/requests");
  revalidatePath("/member/requests");
  revalidatePath("/admin");
  return { success: true, message: `Pengajuan berhasil ${approve ? "disetujui" : "ditolak"}.` };
}
