"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestBalanceImpact } from "@/lib/workday-balance";

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
          memberStatus: true,
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

      // Hitung jumlah hari pengajuan.
      let daysCount = 0;
      const countDate = new Date(start);
      while (countDate <= end) {
        daysCount++;
        countDate.setUTCDate(countDate.getUTCDate() + 1);
      }

      const { workdayBalanceDelta, annualLeaveBalanceDelta } = getRequestBalanceImpact(
        request.type,
        Boolean(request.attachmentUrl),
        request.user.memberStatus
      );

      const totalWorkdayDelta = workdayBalanceDelta * daysCount;
      const totalLeaveDelta = annualLeaveBalanceDelta * daysCount;

      if (totalWorkdayDelta !== 0 || totalLeaveDelta !== 0) {
        await tx.user.update({
          where: { id: request.userId },
          data: {
            ...(totalWorkdayDelta !== 0 && { workDayBalance: { increment: totalWorkdayDelta } }),
            ...(totalLeaveDelta !== 0 && { annualLeaveBalance: { increment: totalLeaveDelta } }),
          },
        });
      }

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
            DISPENSATION: "DISPENSATION" as const,
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

      // Hitung jumlah hari pengajuan.
      let daysCount = 0;
      const countDate = new Date(start);
      while (countDate <= end) {
        daysCount++;
        countDate.setUTCDate(countDate.getUTCDate() + 1);
      }

      if (request.type === "PERMISSION") {
        await tx.user.update({
          where: { id: request.userId },
          data: {
            workDayBalance: {
              decrement: daysCount,
            },
          },
        });
      } else if (request.type === "LEAVE") {
        await tx.user.update({
          where: { id: request.userId },
          data: {
            annualLeaveBalance: {
              decrement: daysCount,
            },
          },
        });
      }

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
            DISPENSATION: "DISPENSATION" as const,
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

export async function deleteRequestAction(formData: FormData) {
  const superAdmin = await requireAnyRole(["SUPER_ADMIN"]);
  const requestId = String(formData.get("requestId") ?? "");

  if (!requestId) {
    redirect("/admin/requests?error=invalid-action");
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    redirect("/admin/requests?error=not-found");
  }

  await prisma.$transaction(async (tx) => {
    // If approved, we need to revert side effects
    if (request.status === "APPROVED") {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      // 1. Revert balance side effects
      if (request.type === "PERMISSION" || request.type === "LEAVE") {
        let daysCount = 0;
        const countDate = new Date(start);
        while (countDate <= end) {
          daysCount++;
          countDate.setUTCDate(countDate.getUTCDate() + 1);
        }
        if (request.type === "PERMISSION") {
          await tx.user.update({
            where: { id: request.userId },
            data: {
              workDayBalance: {
                increment: daysCount,
              },
            },
          });
        } else {
          await tx.user.update({
            where: { id: request.userId },
            data: {
              annualLeaveBalance: {
                increment: daysCount,
              },
            },
          });
        }
      }

      // 2. Revert materialized schedules/records
      const current = new Date(start);
      while (current <= end) {
        const dateVal = new Date(current);
        if (request.type === "WFH") {
          // Delete materialized WFH schedule
          await tx.personalWorkSchedule.deleteMany({
            where: {
              userId: request.userId,
              workDate: dateVal,
            },
          });
        } else {
          // Delete materialized AttendanceRecord if it has no checkIn/checkOut
          // (which means it was created by request approval)
          await tx.attendanceRecord.deleteMany({
            where: {
              userId: request.userId,
              attendanceDate: dateVal,
              checkInAt: null,
              checkOutAt: null,
            },
          });
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    // 3. Delete the request
    await tx.request.delete({
      where: { id: requestId },
    });

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        actorId: superAdmin.id,
        entity: "Request",
        entityId: requestId,
        action: "REQUEST_DELETED",
        metadata: {
          userId: request.userId,
          type: request.type,
          status: request.status,
          startDate: request.startDate,
          endDate: request.endDate,
        },
      },
    });
  });

  revalidatePath("/admin/requests");
  revalidatePath("/member/requests");
  redirect("/admin/requests?success=deleted");
}
