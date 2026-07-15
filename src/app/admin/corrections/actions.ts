"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Review Correction (Redirecting Action) ─────────────────────────────────

export async function reviewCorrectionAction(formData: FormData) {
  const reviewer = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);

  const correctionId = String(formData.get("correctionId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!correctionId || !["APPROVE", "REJECT"].includes(action)) {
    redirect("/admin/corrections?error=invalid-action");
  }

  // Fetch the correction request
  const correction = await prisma.attendanceCorrection.findUnique({
    where: { id: correctionId },
    include: {
      attendanceRecord: {
        select: {
          id: true,
          attendanceDate: true,
          ownerStudioId: true,
          locationStudioId: true,
          userId: true,
          user: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!correction) {
    redirect("/admin/corrections?error=not-found");
  }

  if (correction.status !== "PENDING") {
    redirect("/admin/corrections?error=already-reviewed");
  }

  // Scope check: Admin can only review corrections from their own studio or if they have placement active
  const activePlacement = await prisma.placement.findFirst({
    where: {
      userId: correction.requestedById,
      studioId: reviewer.defaultStudioId ?? "__none__",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const isAuthorized =
    correction.attendanceRecord.ownerStudioId === reviewer.defaultStudioId ||
    correction.attendanceRecord.locationStudioId === reviewer.defaultStudioId ||
    !!activePlacement;

  if (reviewer.role === "ADMIN" && !isAuthorized) {
    redirect("/admin/corrections?error=unauthorized-studio");
  }

  // Admin cannot review corrections from other Admins or Super Admins
  if (
    reviewer.role === "ADMIN" &&
    (correction.attendanceRecord.user.role === "ADMIN" ||
      correction.attendanceRecord.user.role === "SUPER_ADMIN")
  ) {
    redirect("/admin/corrections?error=unauthorized-admin-review");
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.$transaction(async (tx) => {
    // 1. Update the correction request
    await tx.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        status: newStatus,
        approvedById: reviewer.id,
      },
    });

    // 2. Audit log
    await tx.auditLog.create({
      data: {
        actorId: reviewer.id,
        entity: "AttendanceCorrection",
        entityId: correctionId,
        action: `CORRECTION_${newStatus}`,
        metadata: {
          recordId: correction.attendanceRecordId,
          userId: correction.requestedById,
          newStatus: correction.newStatus,
          previousStatus: correction.previousStatus,
        },
      },
    });

    // 3. If approved, update the attendance record status, times, and late minutes
    if (newStatus === "APPROVED" && correction.newStatus) {
      let checkInAt: Date | null = null;
      let checkOutAt: Date | null = null;
      let lateMinutes = 0;

      const isPhysical = correction.newStatus === "ON_TIME" || correction.newStatus === "LATE";
      if (isPhysical && correction.proposedCheckInTime) {
        const [h, m] = correction.proposedCheckInTime.split(":").map(Number);
        checkInAt = new Date(correction.attendanceRecord.attendanceDate);
        checkInAt.setUTCHours(h - 7, m, 0, 0); // Convert Jakarta time to UTC

        if (correction.newStatus === "LATE") {
          // Find active policy for this studio
          const policy = await tx.attendancePolicy.findFirst({
            where: { studioId: correction.attendanceRecord.ownerStudioId, isActive: true },
            select: { checkInTime: true },
          });
          const policyTime = policy?.checkInTime ?? "08:00";
          const [pH, pM] = policyTime.split(":").map(Number);
          
          const proposedTotalMinutes = h * 60 + m;
          const policyTotalMinutes = pH * 60 + pM;
          
          lateMinutes = Math.max(0, proposedTotalMinutes - policyTotalMinutes);
        } else {
          lateMinutes = 0;
        }

        // Retain checkOut if it exists
        const existingRecord = await tx.attendanceRecord.findUnique({
          where: { id: correction.attendanceRecordId },
          select: { checkOutAt: true },
        });
        checkOutAt = existingRecord?.checkOutAt ?? null;
      } else {
        // Non-physical presence reset
        checkInAt = null;
        checkOutAt = null;
        lateMinutes = 0;
      }

      await tx.attendanceRecord.update({
        where: { id: correction.attendanceRecordId },
        data: {
          status: correction.newStatus,
          isManualCorrection: true,
          checkInAt,
          checkOutAt,
          lateMinutes,
          updatedAt: new Date(),
        },
      });
    }
  });

  revalidatePath("/admin/corrections");
  revalidatePath("/member/corrections");
  revalidatePath("/member/presensi/riwayat");
  redirect(`/admin/corrections?success=${action.toLowerCase()}`);
}

// ─── Async Quick Review Action ──────────────────────────────────────────────

export async function quickReviewCorrectionAction(correctionId: string, approve: boolean) {
  const reviewer = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const action = approve ? "APPROVE" : "REJECT";

  if (!correctionId) {
    throw new Error("ID Koreksi tidak valid.");
  }

  // Fetch the correction request
  const correction = await prisma.attendanceCorrection.findUnique({
    where: { id: correctionId },
    include: {
      attendanceRecord: {
        select: {
          id: true,
          attendanceDate: true,
          ownerStudioId: true,
          locationStudioId: true,
          userId: true,
          user: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!correction) {
    throw new Error("Koreksi tidak ditemukan.");
  }

  if (correction.status !== "PENDING") {
    throw new Error("Koreksi sudah diproses sebelumnya.");
  }

  // Scope check: Admin can only review corrections from their own studio or if they have placement active
  const activePlacement = await prisma.placement.findFirst({
    where: {
      userId: correction.requestedById,
      studioId: reviewer.defaultStudioId ?? "__none__",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const isAuthorized =
    correction.attendanceRecord.ownerStudioId === reviewer.defaultStudioId ||
    correction.attendanceRecord.locationStudioId === reviewer.defaultStudioId ||
    !!activePlacement;

  if (reviewer.role === "ADMIN" && !isAuthorized) {
    throw new Error("Anda tidak memiliki akses ke studio ini.");
  }

  // Admin cannot review corrections from other Admins or Super Admins
  if (
    reviewer.role === "ADMIN" &&
    (correction.attendanceRecord.user.role === "ADMIN" ||
      correction.attendanceRecord.user.role === "SUPER_ADMIN")
  ) {
    throw new Error("Anda tidak memiliki wewenang memproses koreksi admin lain.");
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.$transaction(async (tx) => {
    // 1. Update the correction request
    await tx.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        status: newStatus,
        approvedById: reviewer.id,
      },
    });

    // 2. Audit log
    await tx.auditLog.create({
      data: {
        actorId: reviewer.id,
        entity: "AttendanceCorrection",
        entityId: correctionId,
        action: `CORRECTION_${newStatus}`,
        metadata: {
          recordId: correction.attendanceRecordId,
          userId: correction.requestedById,
          newStatus: correction.newStatus,
          previousStatus: correction.previousStatus,
        },
      },
    });

    // 3. If approved, update the attendance record status, times, and late minutes
    if (newStatus === "APPROVED" && correction.newStatus) {
      let checkInAt: Date | null = null;
      let checkOutAt: Date | null = null;
      let lateMinutes = 0;

      const isPhysical = correction.newStatus === "ON_TIME" || correction.newStatus === "LATE";
      if (isPhysical && correction.proposedCheckInTime) {
        const [h, m] = correction.proposedCheckInTime.split(":").map(Number);
        checkInAt = new Date(correction.attendanceRecord.attendanceDate);
        checkInAt.setUTCHours(h - 7, m, 0, 0); // Convert Jakarta time to UTC

        if (correction.newStatus === "LATE") {
          // Find active policy for this studio
          const policy = await tx.attendancePolicy.findFirst({
            where: { studioId: correction.attendanceRecord.ownerStudioId, isActive: true },
            select: { checkInTime: true },
          });
          const policyTime = policy?.checkInTime ?? "08:00";
          const [pH, pM] = policyTime.split(":").map(Number);
          
          const proposedTotalMinutes = h * 60 + m;
          const policyTotalMinutes = pH * 60 + pM;
          
          lateMinutes = Math.max(0, proposedTotalMinutes - policyTotalMinutes);
        } else {
          lateMinutes = 0;
        }

        // Retain checkOut if it exists
        const existingRecord = await tx.attendanceRecord.findUnique({
          where: { id: correction.attendanceRecordId },
          select: { checkOutAt: true },
        });
        checkOutAt = existingRecord?.checkOutAt ?? null;
      } else {
        // Non-physical presence reset
        checkInAt = null;
        checkOutAt = null;
        lateMinutes = 0;
      }

      await tx.attendanceRecord.update({
        where: { id: correction.attendanceRecordId },
        data: {
          status: correction.newStatus,
          isManualCorrection: true,
          checkInAt,
          checkOutAt,
          lateMinutes,
          updatedAt: new Date(),
        },
      });
    }
  });

  revalidatePath("/admin/corrections");
  revalidatePath("/member/corrections");
  revalidatePath("/member/presensi/riwayat");
  revalidatePath("/admin");
  return { success: true, message: `Koreksi berhasil ${approve ? "disetujui" : "ditolak"}.` };
}

export async function deleteCorrectionAction(formData: FormData) {
  const superAdmin = await requireAnyRole(["SUPER_ADMIN"]);
  const correctionId = String(formData.get("correctionId") ?? "");

  if (!correctionId) {
    redirect("/admin/requests?error=invalid-action");
  }

  const correction = await prisma.attendanceCorrection.findUnique({
    where: { id: correctionId },
    include: {
      attendanceRecord: true,
    },
  });

  if (!correction) {
    redirect("/admin/requests?error=not-found");
  }

  await prisma.$transaction(async (tx) => {
    // If approved, revert the attendance record changes
    if (correction.status === "APPROVED" && correction.previousStatus) {
      const isPhysical = correction.previousStatus === "ON_TIME" || correction.previousStatus === "LATE";
      
      await tx.attendanceRecord.update({
        where: { id: correction.attendanceRecordId },
        data: {
          status: correction.previousStatus,
          isManualCorrection: false,
          // If the previous status was not physical, clear check-in/out times
          ...(!isPhysical ? {
            checkInAt: null,
            checkOutAt: null,
            lateMinutes: 0,
          } : {}),
          updatedAt: new Date(),
        },
      });
    }

    // Delete the correction request
    await tx.attendanceCorrection.delete({
      where: { id: correctionId },
    });

    // Audit Log
    await tx.auditLog.create({
      data: {
        actorId: superAdmin.id,
        entity: "AttendanceCorrection",
        entityId: correctionId,
        action: "CORRECTION_DELETED",
        metadata: {
          recordId: correction.attendanceRecordId,
          userId: correction.requestedById,
          status: correction.status,
          previousStatus: correction.previousStatus,
          newStatus: correction.newStatus,
        },
      },
    });
  });

  revalidatePath("/admin/requests");
  revalidatePath("/member/corrections");
  redirect("/admin/requests?success=deleted");
}
