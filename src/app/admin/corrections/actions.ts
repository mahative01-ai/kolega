"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
          ownerStudioId: true,
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

  // Scope check: Admin can only review corrections from their own studio
  if (
    reviewer.role === "ADMIN" &&
    correction.attendanceRecord.ownerStudioId !== reviewer.defaultStudioId
  ) {
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

    // 3. If approved, update the attendance record status
    if (newStatus === "APPROVED" && correction.newStatus) {
      await tx.attendanceRecord.update({
        where: { id: correction.attendanceRecordId },
        data: {
          status: correction.newStatus,
          isManualCorrection: true,
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
          ownerStudioId: true,
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

  // Scope check: Admin can only review corrections from their own studio
  if (
    reviewer.role === "ADMIN" &&
    correction.attendanceRecord.ownerStudioId !== reviewer.defaultStudioId
  ) {
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

    // 3. If approved, update the attendance record status
    if (newStatus === "APPROVED" && correction.newStatus) {
      await tx.attendanceRecord.update({
        where: { id: correction.attendanceRecordId },
        data: {
          status: correction.newStatus,
          isManualCorrection: true,
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
